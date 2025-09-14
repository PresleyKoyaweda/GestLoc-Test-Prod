/*
  # Création des tables locataires et baux

  1. Tables principales
    - `tenants` - Informations des locataires
    - `leases` - Contrats de bail
    - `lease_documents` - Documents associés aux baux

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques d'accès propriétaire/locataire

  3. Fonctionnalités
    - Gestion complète des baux
    - Contacts d'urgence
    - Documents de bail
*/

-- Table des locataires
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  lease_start date NOT NULL,
  lease_end date NOT NULL,
  monthly_rent decimal(10,2) NOT NULL,
  deposit_paid decimal(10,2) DEFAULT 0,
  payment_due_date integer CHECK (payment_due_date >= 1 AND payment_due_date <= 31) DEFAULT 1,
  emergency_contact jsonb DEFAULT '{}',
  status text CHECK (status IN ('active', 'inactive', 'terminated')) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des baux (contrats)
CREATE TABLE IF NOT EXISTS leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  lease_type text CHECK (lease_type IN ('fixed', 'month_to_month', 'renewed')) DEFAULT 'fixed',
  start_date date NOT NULL,
  end_date date NOT NULL,
  monthly_rent decimal(10,2) NOT NULL,
  security_deposit decimal(10,2) DEFAULT 0,
  special_clauses text[] DEFAULT '{}',
  signed_date timestamptz,
  landlord_signature boolean DEFAULT false,
  tenant_signature boolean DEFAULT false,
  witness_signature boolean DEFAULT false,
  status text CHECK (status IN ('draft', 'pending', 'active', 'terminated', 'expired')) DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des documents de bail
CREATE TABLE IF NOT EXISTS lease_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid REFERENCES leases(id) ON DELETE CASCADE NOT NULL,
  document_type text CHECK (document_type IN ('lease_contract', 'addendum', 'renewal', 'termination', 'inspection')) NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_documents ENABLE ROW LEVEL SECURITY;

-- Politiques pour tenants
CREATE POLICY "Property owners can manage their tenants"
  ON tenants
  FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can read their own data"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Tenants can update their own data"
  ON tenants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques pour leases
CREATE POLICY "Property owners can manage leases"
  ON leases
  FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can read their leases"
  ON leases
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    )
  );

-- Politiques pour lease_documents
CREATE POLICY "Property owners can manage lease documents"
  ON lease_documents
  FOR ALL
  TO authenticated
  USING (
    lease_id IN (
      SELECT l.id FROM leases l
      JOIN properties p ON l.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can read their lease documents"
  ON lease_documents
  FOR SELECT
  TO authenticated
  USING (
    lease_id IN (
      SELECT l.id FROM leases l
      JOIN tenants t ON l.tenant_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

-- Triggers pour updated_at
CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER leases_updated_at
  BEFORE UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id);