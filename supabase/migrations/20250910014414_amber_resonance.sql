/*
  # Ajout de la table pour les photos par pièce

  1. Nouvelle table
    - `property_photos` - Photos par pièce/zone de la propriété

  2. Sécurité
    - Enable RLS sur la nouvelle table
    - Politiques d'accès propriétaire/locataire

  3. Fonctionnalités
    - Photos organisées par pièce
    - Photo principale par propriété
    - Descriptions et métadonnées
*/

-- Table des photos de propriété par pièce
CREATE TABLE IF NOT EXISTS property_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  room_name text NOT NULL, -- 'exterior', 'living_room', 'kitchen', 'bedroom', 'bathroom', 'balcony', 'parking', 'common_area', 'other'
  photo_url text NOT NULL,
  description text,
  is_main boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;

-- Politiques pour property_photos
CREATE POLICY "Property owners can manage their property photos"
  ON property_photos
  FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can read property photos for available properties"
  ON property_photos
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE status = 'libre'
    )
  );

CREATE POLICY "Tenants can read photos for their properties"
  ON property_photos
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT DISTINCT t.property_id FROM tenants t WHERE t.user_id = auth.uid()
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER property_photos_updated_at
  BEFORE UPDATE ON property_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_property_photos_property_id ON property_photos(property_id);
CREATE INDEX IF NOT EXISTS idx_property_photos_room_name ON property_photos(room_name);
CREATE INDEX IF NOT EXISTS idx_property_photos_is_main ON property_photos(is_main);