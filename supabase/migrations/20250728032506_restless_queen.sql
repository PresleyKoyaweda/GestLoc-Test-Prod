/*
  # Configuration centralisée des agents IA

  1. Tables principales
    - `ai_plan_features` - Fonctionnalités IA par plan d'abonnement
    - `ai_usage_tracking` - Suivi de l'utilisation des agents IA

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques d'accès basées sur l'abonnement

  3. Configuration
    - Définition des limites par plan
    - Tracking de l'utilisation
*/

-- Table de configuration des fonctionnalités IA par plan
CREATE TABLE IF NOT EXISTS ai_plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan text CHECK (plan IN ('free', 'pro', 'business')) NOT NULL,
  agent_type text CHECK (agent_type IN ('payment', 'fiscal', 'communication', 'diagnostic', 'contract', 'summary')) NOT NULL,
  enabled boolean DEFAULT false,
  monthly_limit integer DEFAULT 0, -- 0 = illimité, -1 = désactivé
  features jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(plan, agent_type)
);

-- Table de suivi de l'utilisation IA
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  agent_type text NOT NULL,
  usage_month text NOT NULL, -- Format YYYY-MM
  usage_count integer DEFAULT 0,
  tokens_used integer DEFAULT 0,
  cost_incurred decimal(8,4) DEFAULT 0,
  last_used timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, agent_type, usage_month)
);

-- Enable RLS
ALTER TABLE ai_plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Politiques pour ai_plan_features (lecture publique pour vérifier les limites)
CREATE POLICY "Everyone can read AI plan features"
  ON ai_plan_features
  FOR SELECT
  TO authenticated
  USING (true);

-- Politiques pour ai_usage_tracking
CREATE POLICY "Users can read their AI usage"
  ON ai_usage_tracking
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their AI usage"
  ON ai_usage_tracking
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Insérer la configuration par défaut des plans
INSERT INTO ai_plan_features (plan, agent_type, enabled, monthly_limit) VALUES
-- Plan gratuit - IA désactivée
('free', 'payment', false, -1),
('free', 'fiscal', false, -1),
('free', 'communication', false, -1),
('free', 'diagnostic', false, -1),
('free', 'contract', false, -1),
('free', 'summary', false, -1),

-- Plan Pro - IA de base activée
('pro', 'payment', true, 50),
('pro', 'fiscal', true, 20),
('pro', 'communication', true, 100),
('pro', 'diagnostic', false, -1),
('pro', 'contract', false, -1),
('pro', 'summary', true, 10),

-- Plan Business - Toutes les IA activées
('business', 'payment', true, 0), -- illimité
('business', 'fiscal', true, 0),
('business', 'communication', true, 0),
('business', 'diagnostic', true, 0),
('business', 'contract', true, 0),
('business', 'summary', true, 0)
ON CONFLICT (plan, agent_type) DO NOTHING;

-- Fonction pour vérifier si un utilisateur peut utiliser un agent IA
CREATE OR REPLACE FUNCTION can_use_ai_agent(
  user_id_param uuid,
  agent_type_param text
)
RETURNS boolean AS $$
DECLARE
  user_plan text;
  feature_config RECORD;
  current_usage integer;
  usage_month text;
BEGIN
  -- Récupérer le plan de l'utilisateur
  SELECT s.plan INTO user_plan
  FROM subscriptions s
  WHERE s.user_id = user_id_param
  AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Si pas d'abonnement, considérer comme gratuit
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Récupérer la configuration pour ce plan et cet agent
  SELECT * INTO feature_config
  FROM ai_plan_features
  WHERE plan = user_plan
  AND agent_type = agent_type_param;
  
  -- Si pas de configuration ou désactivé
  IF feature_config IS NULL OR NOT feature_config.enabled THEN
    RETURN false;
  END IF;
  
  -- Si limite illimitée
  IF feature_config.monthly_limit = 0 THEN
    RETURN true;
  END IF;
  
  -- Vérifier l'utilisation du mois en cours
  usage_month := to_char(now(), 'YYYY-MM');
  
  SELECT COALESCE(usage_count, 0) INTO current_usage
  FROM ai_usage_tracking
  WHERE user_id = user_id_param
  AND agent_type = agent_type_param
  AND usage_month = usage_month;
  
  -- Vérifier si sous la limite
  RETURN current_usage < feature_config.monthly_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour enregistrer l'utilisation d'un agent IA
CREATE OR REPLACE FUNCTION track_ai_usage(
  user_id_param uuid,
  agent_type_param text,
  tokens_used_param integer DEFAULT 0,
  cost_param decimal DEFAULT 0
)
RETURNS void AS $$
DECLARE
  usage_month text;
BEGIN
  usage_month := to_char(now(), 'YYYY-MM');
  
  INSERT INTO ai_usage_tracking (
    user_id,
    agent_type,
    usage_month,
    usage_count,
    tokens_used,
    cost_incurred,
    last_used
  )
  VALUES (
    user_id_param,
    agent_type_param,
    usage_month,
    1,
    tokens_used_param,
    cost_param,
    now()
  )
  ON CONFLICT (user_id, agent_type, usage_month)
  DO UPDATE SET
    usage_count = ai_usage_tracking.usage_count + 1,
    tokens_used = ai_usage_tracking.tokens_used + tokens_used_param,
    cost_incurred = ai_usage_tracking.cost_incurred + cost_param,
    last_used = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour updated_at
CREATE TRIGGER ai_usage_tracking_updated_at
  BEFORE UPDATE ON ai_usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_user_month ON ai_usage_tracking(user_id, usage_month);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_agent_type ON ai_usage_tracking(agent_type);