/*
  # Création des tables paiements et dépenses

  1. Tables principales
    - `payments` - Paiements des locataires
    - `expenses` - Dépenses des propriétaires
    - `payment_methods` - Méthodes de paiement

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques d'accès sécurisées

  3. Fonctionnalités
    - Suivi des paiements automatique
    - Gestion des dépenses par catégorie
    - Historique complet
*/

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  due_date date NOT NULL,
  paid_date timestamptz,
  status text CHECK (status IN ('pending', 'paid', 'late', 'overdue')) DEFAULT 'pending',
  payment_method text,
  transaction_id text,
  notes text,
  late_fees decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des dépenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  issue_id uuid, -- Référence vers les problèmes (sera créé plus tard)
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  type text CHECK (type IN ('maintenance', 'renovation', 'utilities', 'insurance', 'taxes', 'other')) NOT NULL,
  receipt_url text,
  date date NOT NULL,
  vendor text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table des méthodes de paiement
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN ('credit_card', 'bank_transfer', 'cash', 'check', 'e_transfer')) NOT NULL,
  details jsonb DEFAULT '{}', -- Stockage sécurisé des détails (masqués)
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Politiques pour payments
CREATE POLICY "Property owners can read payments for their properties"
  ON payments
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

CREATE POLICY "Property owners can manage payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      JOIN properties p ON t.property_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can read their payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    )
  );

-- Politiques pour expenses
CREATE POLICY "Owners can manage their expenses"
  ON expenses
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id);

-- Politiques pour payment_methods
CREATE POLICY "Users can manage their payment methods"
  ON payment_methods
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Fonction pour générer les paiements mensuels automatiquement
CREATE OR REPLACE FUNCTION generate_monthly_payments()
RETURNS void AS $$
DECLARE
  tenant_record RECORD;
  payment_date date;
BEGIN
  -- Pour chaque locataire actif
  FOR tenant_record IN 
    SELECT * FROM tenants 
    WHERE status = 'active' 
    AND lease_end >= CURRENT_DATE
  LOOP
    -- Calculer la date du prochain paiement
    payment_date := date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day' + tenant_record.payment_due_date;
    
    -- Vérifier si le paiement n'existe pas déjà
    IF NOT EXISTS (
      SELECT 1 FROM payments 
      WHERE tenant_id = tenant_record.id 
      AND due_date = payment_date
    ) THEN
      -- Créer le paiement
      INSERT INTO payments (tenant_id, property_id, amount, due_date, status)
      VALUES (
        tenant_record.id,
        tenant_record.property_id,
        tenant_record.monthly_rent,
        payment_date,
        CASE 
          WHEN payment_date < CURRENT_DATE THEN 'late'
          ELSE 'pending'
        END
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour mettre à jour le statut des paiements en retard
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS void AS $$
BEGIN
  -- Marquer les paiements en retard
  UPDATE payments 
  SET status = 'late', updated_at = now()
  WHERE status = 'pending' 
  AND due_date < CURRENT_DATE;
  
  -- Marquer les paiements très en retard comme impayés
  UPDATE payments 
  SET status = 'overdue', updated_at = now()
  WHERE status = 'late' 
  AND due_date < CURRENT_DATE - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers pour updated_at
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_expenses_owner_id ON expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);