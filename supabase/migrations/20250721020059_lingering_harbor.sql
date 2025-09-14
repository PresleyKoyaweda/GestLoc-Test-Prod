/*
  # Création des tables propriétés et unités

  1. Tables principales
    - `properties` - Propriétés immobilières
    - `units` - Unités/chambres dans les propriétés partagées
    - `visit_slots` - Créneaux de visite disponibles
    - `visit_requests` - Demandes de visite

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques d'accès basées sur la propriété

  3. Fonctionnalités
    - Support des propriétés entières et partagées
    - Gestion des créneaux de visite
    - Statuts de disponibilité
*/

-- Table des propriétés
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address jsonb NOT NULL DEFAULT '{}',
  type text CHECK (type IN ('entire', 'shared')) NOT NULL,
  total_rooms integer,
  total_bathrooms integer DEFAULT 1,
  total_area decimal(8,2),
  description text,
  images text[] DEFAULT '{}',
  status text CHECK (status IN ('libre', 'en_attente_validation', 'occupe')) DEFAULT 'libre',
  rent decimal(10,2), -- Pour les propriétés entières
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des unités (pour les colocations)
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  area decimal(8,2),
  rent decimal(10,2) NOT NULL,
  status text CHECK (status IN ('libre', 'en_attente_validation', 'occupe')) DEFAULT 'libre',
  tenant_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  equipment text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Table des créneaux de visite
CREATE TABLE IF NOT EXISTS visit_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  unit_id uuid REFERENCES units(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time NOT NULL,
  available boolean DEFAULT true,
  booked_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table des demandes de visite
CREATE TABLE IF NOT EXISTS visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  unit_id uuid REFERENCES units(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  slot_id uuid REFERENCES visit_slots(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
  tenant_info jsonb NOT NULL DEFAULT '{}',
  request_date timestamptz DEFAULT now(),
  visit_date date NOT NULL,
  visit_time time NOT NULL,
  owner_notes text
);

-- Table des demandes de propriété
CREATE TABLE IF NOT EXISTS property_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('en_attente', 'acceptee', 'rejetee')) DEFAULT 'en_attente',
  request_date timestamptz DEFAULT now(),
  response_date timestamptz,
  owner_notes text,
  tenant_info jsonb NOT NULL DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_requests ENABLE ROW LEVEL SECURITY;

-- Politiques pour properties
CREATE POLICY "Owners can manage their properties"
  ON properties
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Everyone can read available properties"
  ON properties
  FOR SELECT
  TO authenticated
  USING (status = 'libre');

-- Politiques pour units
CREATE POLICY "Property owners can manage units"
  ON units
  FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can read available units"
  ON units
  FOR SELECT
  TO authenticated
  USING (
    status = 'libre' AND
    property_id IN (
      SELECT id FROM properties WHERE status = 'libre'
    )
  );

-- Politiques pour visit_slots
CREATE POLICY "Property owners can manage visit slots"
  ON visit_slots
  FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can read available visit slots"
  ON visit_slots
  FOR SELECT
  TO authenticated
  USING (available = true);

-- Politiques pour visit_requests
CREATE POLICY "Property owners can read visit requests"
  ON visit_requests
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can read their visit requests"
  ON visit_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can create visit requests"
  ON visit_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Property owners can update visit requests"
  ON visit_requests
  FOR UPDATE
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

-- Politiques pour property_requests
CREATE POLICY "Property owners can read property requests"
  ON property_requests
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    ) OR
    unit_id IN (
      SELECT u.id FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can read their property requests"
  ON property_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can create property requests"
  ON property_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Property owners can update property requests"
  ON property_requests
  FOR UPDATE
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    ) OR
    unit_id IN (
      SELECT u.id FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

-- Triggers pour updated_at
CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();