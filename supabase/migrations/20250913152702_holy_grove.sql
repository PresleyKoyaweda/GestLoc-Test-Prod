/*
  # Table photos de propriété - Version finale sécurisée

  1. Nouvelle table
    - `property_photos` - Photos par pièce/zone de la propriété

  2. Sécurité
    - Enable RLS avec vérifications
    - Politiques avec gestion des conflits

  3. Fonctionnalités
    - Photos organisées par pièce
    - Photo principale par propriété
    - Descriptions et métadonnées
*/

-- Créer la table seulement si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'property_photos'
  ) THEN
    CREATE TABLE property_photos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
      room_name text NOT NULL,
      photo_url text NOT NULL,
      description text,
      is_main boolean DEFAULT false,
      display_order integer DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    RAISE NOTICE 'Table property_photos créée avec succès';
  ELSE
    RAISE NOTICE 'Table property_photos existe déjà, pas de création';
  END IF;
END $$;

-- Enable RLS seulement si pas déjà activé
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename = 'property_photos' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS activé sur property_photos';
  ELSE
    RAISE NOTICE 'RLS déjà activé sur property_photos';
  END IF;
END $$;

-- Supprimer les politiques existantes pour éviter les conflits
/*
DO $$
BEGIN
  -- Supprimer toutes les politiques existantes sur property_photos
  DROP POLICY IF EXISTS "Property owners can manage their property photos" ON property_photos;
  DROP POLICY IF EXISTS "Everyone can read property photos for available properties" ON property_photos;
  DROP POLICY IF EXISTS "Tenants can read photos for their properties" ON property_photos;
  
  RAISE NOTICE 'Anciennes politiques supprimées';
END $$;
*/

-- Créer les nouvelles politiques
DO $$
BEGIN
  -- Politique pour les propriétaires
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'property_photos' 
    AND policyname = 'owners_manage_photos'
  ) THEN
    CREATE POLICY "owners_manage_photos"
      ON property_photos
      FOR ALL
      TO authenticated
      USING (
        property_id IN (
          SELECT id FROM properties WHERE owner_id = auth.uid()
        )
      );
    RAISE NOTICE 'Politique propriétaires créée';
  END IF;

  -- Politique pour lecture publique des propriétés disponibles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'property_photos' 
    AND policyname = 'public_read_available_photos'
  ) THEN
    CREATE POLICY "public_read_available_photos"
      ON property_photos
      FOR SELECT
      TO authenticated
      USING (
        property_id IN (
          SELECT id FROM properties WHERE status = 'libre'
        )
      );
    RAISE NOTICE 'Politique lecture publique créée';
  END IF;

  -- Politique pour les locataires
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'property_photos' 
    AND policyname = 'tenants_read_their_photos'
  ) THEN
    CREATE POLICY "tenants_read_their_photos"
      ON property_photos
      FOR SELECT
      TO authenticated
      USING (
        property_id IN (
          SELECT DISTINCT t.property_id FROM tenants t WHERE t.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Politique locataires créée';
  END IF;
END $$;

-- Trigger pour updated_at seulement si pas déjà existant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'property_photos_updated_at_trigger'
    AND event_object_table = 'property_photos'
  ) THEN
    CREATE TRIGGER property_photos_updated_at_trigger
      BEFORE UPDATE ON property_photos
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
    RAISE NOTICE 'Trigger updated_at créé';
  ELSE
    RAISE NOTICE 'Trigger updated_at existe déjà';
  END IF;
END $$;

-- Index pour les performances seulement si pas déjà existants
DO $$
BEGIN
  -- Index property_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_property_photos_property_id'
  ) THEN
    CREATE INDEX idx_property_photos_property_id ON property_photos(property_id);
    RAISE NOTICE 'Index property_id créé';
  END IF;

  -- Index room_name
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_property_photos_room_name'
  ) THEN
    CREATE INDEX idx_property_photos_room_name ON property_photos(room_name);
    RAISE NOTICE 'Index room_name créé';
  END IF;

  -- Index is_main
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_property_photos_is_main'
  ) THEN
    CREATE INDEX idx_property_photos_is_main ON property_photos(is_main);
    RAISE NOTICE 'Index is_main créé';
  END IF;
END $$;

-- Vérification finale
DO $$
DECLARE
  table_exists boolean;
  rls_enabled boolean;
  policy_count integer;
BEGIN
  -- Vérifier que la table existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'property_photos'
  ) INTO table_exists;

  -- Vérifier que RLS est activé
  SELECT rowsecurity FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'property_photos'
  INTO rls_enabled;

  -- Compter les politiques
  SELECT COUNT(*) FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'property_photos'
  INTO policy_count;

  RAISE NOTICE 'Migration property_photos terminée:';
  RAISE NOTICE '- Table existe: %', table_exists;
  RAISE NOTICE '- RLS activé: %', COALESCE(rls_enabled, false);
  RAISE NOTICE '- Politiques créées: %', policy_count;
END $$;
