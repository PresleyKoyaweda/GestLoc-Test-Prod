/*
  # Création des tables problèmes et notifications

  1. Tables principales
    - `issues` - Problèmes signalés par les locataires
    - `notifications` - Système de notifications
    - `ai_analyses` - Historique des analyses IA

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques d'accès sécurisées

  3. Fonctionnalités
    - Gestion complète des problèmes
    - Système de notifications en temps réel
    - Historique des analyses IA
*/

-- Table des problèmes/incidents
CREATE TABLE IF NOT EXISTS issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status text CHECK (status IN ('pending', 'in_progress', 'resolved')) DEFAULT 'pending',
  photos text[] DEFAULT '{}',
  owner_notes text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mettre à jour la table expenses pour référencer les issues
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'issue_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN issue_id uuid REFERENCES issues(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN ('payment_reminder', 'payment_overdue', 'issue_reported', 'issue_resolved', 'general')) NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  data jsonb DEFAULT '{}', -- Données supplémentaires pour l'action
  created_at timestamptz DEFAULT now()
);

-- Table des analyses IA
CREATE TABLE IF NOT EXISTS ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  agent_type text CHECK (agent_type IN ('payment', 'fiscal', 'communication', 'diagnostic', 'contract', 'summary')) NOT NULL,
  input_data jsonb NOT NULL,
  output_data jsonb NOT NULL,
  execution_time interval,
  cost decimal(8,4), -- Coût en crédits/tokens
  status text CHECK (status IN ('success', 'error', 'timeout')) DEFAULT 'success',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Table de configuration des agents IA
CREATE TABLE IF NOT EXISTS ai_agent_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  agent_type text NOT NULL,
  enabled boolean DEFAULT true,
  config jsonb DEFAULT '{}',
  last_execution timestamptz,
  execution_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, agent_type)
);

-- Enable RLS
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_configs ENABLE ROW LEVEL SECURITY;

-- Politiques pour issues
CREATE POLICY "Property owners can read issues for their properties"
  ON issues
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    ) OR
    tenant_id IN (
      SELECT t.id FROM tenants t
      JOIN properties p ON t.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can manage issues"
  ON issues
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      JOIN properties p ON t.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can read their issues"
  ON issues
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can create issues"
  ON issues
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    )
  );

-- Politiques pour notifications
CREATE POLICY "Users can read their notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques pour ai_analyses
CREATE POLICY "Users can read their AI analyses"
  ON ai_analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create AI analyses"
  ON ai_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politiques pour ai_agent_configs
CREATE POLICY "Users can manage their AI agent configs"
  ON ai_agent_configs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_message text,
  notification_data jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (target_user_id, notification_type, notification_title, notification_message, notification_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers pour updated_at
CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ai_agent_configs_updated_at
  BEFORE UPDATE ON ai_agent_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_issues_tenant_id ON issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_issues_property_id ON issues(property_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_id ON ai_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_agent_type ON ai_analyses(agent_type);