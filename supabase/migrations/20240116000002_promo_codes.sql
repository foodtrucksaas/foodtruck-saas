-- ============================================
-- CODES PROMO
-- Système de réductions pour les clients
-- ============================================

-- Type de réduction
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

-- Table des codes promo
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID NOT NULL REFERENCES foodtrucks(id) ON DELETE CASCADE,

  code TEXT NOT NULL,                    -- Ex: "PROMO10", "BIENVENUE"
  description TEXT,                       -- Description interne

  discount_type discount_type NOT NULL,   -- percentage ou fixed
  discount_value INTEGER NOT NULL,        -- En % ou centimes (1000 = 10€)

  -- Limites
  min_order_amount INTEGER DEFAULT 0,     -- Montant minimum de commande (centimes)
  max_discount INTEGER,                   -- Réduction max pour % (centimes)
  max_uses INTEGER,                       -- Nombre max d'utilisations total
  max_uses_per_customer INTEGER DEFAULT 1,-- Max par client

  -- Validité
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,

  -- Stats
  current_uses INTEGER DEFAULT 0,
  total_discount_given INTEGER DEFAULT 0, -- Total des réductions accordées

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un code unique par foodtruck
  UNIQUE(foodtruck_id, code)
);

CREATE INDEX idx_promo_codes_foodtruck ON promo_codes(foodtruck_id);
CREATE INDEX idx_promo_codes_code ON promo_codes(foodtruck_id, code) WHERE is_active = TRUE;

-- Historique des utilisations
CREATE TABLE promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  discount_applied INTEGER NOT NULL,      -- Réduction appliquée (centimes)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(promo_code_id, order_id)
);

CREATE INDEX idx_promo_code_uses_code ON promo_code_uses(promo_code_id);
CREATE INDEX idx_promo_code_uses_customer ON promo_code_uses(customer_email);

-- Ajouter colonne promo_code à orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;

-- Fonction pour valider un code promo
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_foodtruck_id UUID,
  p_code TEXT,
  p_customer_email TEXT,
  p_order_amount INTEGER
)
RETURNS TABLE (
  is_valid BOOLEAN,
  promo_code_id UUID,
  discount_type discount_type,
  discount_value INTEGER,
  max_discount INTEGER,
  calculated_discount INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_promo RECORD;
  v_customer_uses INTEGER;
  v_calculated_discount INTEGER;
BEGIN
  -- Chercher le code promo
  SELECT * INTO v_promo
  FROM promo_codes pc
  WHERE pc.foodtruck_id = p_foodtruck_id
    AND UPPER(pc.code) = UPPER(p_code)
    AND pc.is_active = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'Code promo invalide'::TEXT;
    RETURN;
  END IF;

  -- Vérifier la validité temporelle
  IF v_promo.valid_from > NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'Ce code n''est pas encore actif'::TEXT;
    RETURN;
  END IF;

  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'Ce code a expiré'::TEXT;
    RETURN;
  END IF;

  -- Vérifier le montant minimum
  IF p_order_amount < v_promo.min_order_amount THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER,
      ('Commande minimum de ' || ROUND(v_promo.min_order_amount / 100.0, 2)::TEXT || '€ requise')::TEXT;
    RETURN;
  END IF;

  -- Vérifier le nombre max d'utilisations total
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'Ce code a atteint sa limite d''utilisation'::TEXT;
    RETURN;
  END IF;

  -- Vérifier le nombre max par client
  IF v_promo.max_uses_per_customer IS NOT NULL THEN
    SELECT COUNT(*) INTO v_customer_uses
    FROM promo_code_uses pcu
    WHERE pcu.promo_code_id = v_promo.id
      AND LOWER(pcu.customer_email) = LOWER(p_customer_email);

    IF v_customer_uses >= v_promo.max_uses_per_customer THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'Vous avez déjà utilisé ce code'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Calculer la réduction
  IF v_promo.discount_type = 'percentage' THEN
    v_calculated_discount := (p_order_amount * v_promo.discount_value / 100);
    -- Appliquer le max si défini
    IF v_promo.max_discount IS NOT NULL AND v_calculated_discount > v_promo.max_discount THEN
      v_calculated_discount := v_promo.max_discount;
    END IF;
  ELSE
    v_calculated_discount := v_promo.discount_value;
    -- Ne pas dépasser le montant de la commande
    IF v_calculated_discount > p_order_amount THEN
      v_calculated_discount := p_order_amount;
    END IF;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    v_promo.id,
    v_promo.discount_type,
    v_promo.discount_value,
    v_promo.max_discount,
    v_calculated_discount,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour appliquer un code promo (appelée après création de commande)
CREATE OR REPLACE FUNCTION apply_promo_code(
  p_promo_code_id UUID,
  p_order_id UUID,
  p_customer_email TEXT,
  p_discount_applied INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Enregistrer l'utilisation
  INSERT INTO promo_code_uses (promo_code_id, order_id, customer_email, discount_applied)
  VALUES (p_promo_code_id, p_order_id, p_customer_email, p_discount_applied);

  -- Mettre à jour les stats du code promo
  UPDATE promo_codes SET
    current_uses = current_uses + 1,
    total_discount_given = total_discount_given + p_discount_applied,
    updated_at = NOW()
  WHERE id = p_promo_code_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Gestionnaires peuvent gérer leurs codes promo
CREATE POLICY "Foodtruck owners can manage their promo codes"
  ON promo_codes FOR ALL
  USING (
    foodtruck_id IN (
      SELECT id FROM foodtrucks WHERE user_id = auth.uid()
    )
  );

-- Lecture publique des codes actifs (pour validation côté client)
CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes FOR SELECT
  USING (is_active = TRUE);

-- Gestionnaires peuvent voir les utilisations
CREATE POLICY "Foodtruck owners can view promo code uses"
  ON promo_code_uses FOR SELECT
  USING (
    promo_code_id IN (
      SELECT pc.id FROM promo_codes pc
      JOIN foodtrucks f ON f.id = pc.foodtruck_id
      WHERE f.user_id = auth.uid()
    )
  );

-- Grants
GRANT ALL ON promo_codes TO authenticated;
GRANT SELECT ON promo_codes TO anon;
GRANT ALL ON promo_code_uses TO authenticated;

GRANT EXECUTE ON FUNCTION validate_promo_code(UUID, TEXT, TEXT, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION apply_promo_code(UUID, UUID, TEXT, INTEGER) TO authenticated;
