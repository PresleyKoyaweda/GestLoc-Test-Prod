/*
  # Création du système d'authentification et utilisateurs

  1. Tables principales
    - `profiles` - Profils utilisateurs étendus
    - `subscriptions` - Abonnements des utilisateurs
    - `invoices` - Factures et paiements d'abonnement

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques d'accès basées sur l'authentification
    - Triggers pour synchroniser les profils

  3. Fonctions
    - Création automatique de profil à l'inscription
    - Gestion des abonnements
*/

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des profils utilisateurs (étend auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  phone text,
  role text CHECK (role IN ('owner', 'tenant')) DEFAULT 'owner',
  avatar_url text,
  address jsonb DEFAULT '{}',
  preferences jsonb DEFAULT '{
    "language": "fr",
    "currency": "CAD", 
    "theme": "light",
    "notifications": true
  }',
  openai_api_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des abonnements
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan text CHECK (plan IN ('free', 'pro', 'business')) DEFAULT 'free',
  status text CHECK (status IN ('active', 'pending', 'suspended', 'canceled', 'past_due')) DEFAULT 'active',
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '1 month'),
  stripe_customer_id text,
  stripe_subscription_id text,
  cancel_at_period_end boolean DEFAULT false,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des factures
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'CAD',
  status text CHECK (status IN ('paid', 'pending', 'failed', 'draft')) DEFAULT 'pending',
  invoice_number text UNIQUE NOT NULL,
  invoice_date timestamptz DEFAULT now(),
  due_date timestamptz DEFAULT (now() + interval '30 days'),
  paid_date timestamptz,
  stripe_invoice_id text,
  download_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Politiques RLS pour subscriptions
CREATE POLICY "Users can read own subscription"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques RLS pour invoices
CREATE POLICY "Users can read own invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Fonction pour créer un profil automatiquement
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  
  -- Créer un abonnement gratuit par défaut pour les propriétaires
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'owner') = 'owner' THEN
    INSERT INTO subscriptions (user_id, plan, status)
    VALUES (NEW.id, 'free', 'active');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer le profil automatiquement
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();