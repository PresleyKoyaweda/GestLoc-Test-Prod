/*
  # Suppression des clés API individuelles et ajout équipements

  1. Modifications
    - Supprimer la colonne `openai_api_key` de `profiles`
    - Ajouter la table `property_equipment` pour les équipements
    - Ajouter fonction de suppression de compte

  2. Sécurité
    - Enable RLS sur la nouvelle table
    - Politiques d'accès sécurisées
    - Fonction de suppression sécurisée

  3. Fonctionnalités
    - Gestion des équipements par propriété
    - Suppression complète de compte utilisateur
*/

-- Supprimer la colonne openai_api_key de profiles (plus nécessaire)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'openai_api_key'
  ) THEN
    ALTER TABLE profiles DROP COLUMN openai_api_key;
  END IF;
END $$;

-- Table des équipements de propriété
CREATE TABLE IF NOT EXISTS property_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  category text CHECK (category IN ('kitchen', 'bathroom', 'laundry', 'heating', 'cooling', 'security', 'entertainment', 'furniture', 'other')) NOT NULL,
  name text NOT NULL,
  description text,
  condition text CHECK (condition IN ('excellent', 'good', 'fair', 'poor')) DEFAULT 'good',
  included_in_rent boolean DEFAULT true,
  maintenance_date date,
  warranty_expiry date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE property_equipment ENABLE ROW LEVEL SECURITY;

-- Politiques pour property_equipment
CREATE POLICY "Property owners can manage their equipment"
  ON property_equipment
  FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can read equipment for their properties"
  ON property_equipment
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT DISTINCT t.property_id FROM tenants t WHERE t.user_id = auth.uid()
    )
  );

-- Fonction pour supprimer complètement un compte utilisateur
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete uuid)
RETURNS boolean AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Vérifier que l'utilisateur supprime son propre compte
  current_user_id := auth.uid();
  IF current_user_id != user_id_to_delete THEN
    RAISE EXCEPTION 'Unauthorized: Can only delete own account';
  END IF;

  -- Supprimer toutes les données liées (CASCADE s'occupera du reste)
  -- Les foreign keys avec CASCADE supprimeront automatiquement :
  -- - properties, units, tenants, payments, expenses, issues, notifications, etc.
  
  -- Supprimer le profil (qui déclenchera les suppressions en cascade)
  DELETE FROM profiles WHERE id = user_id_to_delete;
  
  -- Supprimer l'utilisateur de auth.users
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting account: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour updated_at
CREATE TRIGGER property_equipment_updated_at
  BEFORE UPDATE ON property_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_property_equipment_property_id ON property_equipment(property_id);
CREATE INDEX IF NOT EXISTS idx_property_equipment_category ON property_equipment(category);