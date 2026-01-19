-- ============================================
-- SYSTEME UNIFIE D'OFFRES
-- Remplace promo_codes et deals par un systeme unifie
-- avec 5 templates: bundle, buy_x_get_y, happy_hour, promo_code, threshold_discount
-- ============================================

-- 1. Type enum pour les templates d'offre
CREATE TYPE offer_type AS ENUM (
  'bundle',           -- Menu/Formule: plusieurs items a prix fixe
  'buy_x_get_y',      -- X achetes = Y offert
  'happy_hour',       -- Reduction sur creneau horaire
  'promo_code',       -- Code promo classique
  'threshold_discount' -- Remise au palier (des X euros)
);

-- 2. Table principale des offres
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID NOT NULL REFERENCES foodtrucks(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  offer_type offer_type NOT NULL,

  -- Configuration JSONB flexible selon le type
  -- bundle: { fixed_price: 1200 }
  -- buy_x_get_y: { trigger_quantity: 3, reward_quantity: 1, reward_type: 'free'|'discount', reward_value?: 500 }
  -- happy_hour: { discount_type: 'percentage'|'fixed', discount_value: 20, applies_to: 'all'|'category', category_id?: 'uuid' }
  -- promo_code: { code: 'BIENVENUE', discount_type: 'percentage'|'fixed', discount_value: 10, min_order_amount?: 1500, max_discount?: 1000 }
  -- threshold_discount: { min_amount: 2500, discount_type: 'percentage'|'fixed', discount_value: 10 }
  config JSONB NOT NULL DEFAULT '{}',

  -- Validite temporelle
  is_active BOOLEAN DEFAULT TRUE,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,

  -- Horaires (pour happy_hour principalement)
  time_start TIME,
  time_end TIME,
  days_of_week INTEGER[], -- 0=dimanche, 1=lundi, ..., 6=samedi

  -- Limites d'utilisation
  max_uses INTEGER,                 -- Nombre max d'utilisations total
  max_uses_per_customer INTEGER,    -- Max par client
  current_uses INTEGER DEFAULT 0,

  -- Stats
  total_discount_given INTEGER DEFAULT 0,

  -- Options
  stackable BOOLEAN DEFAULT FALSE,  -- Cumulable avec autres offres

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_foodtruck ON offers(foodtruck_id);
CREATE INDEX idx_offers_active ON offers(foodtruck_id) WHERE is_active = TRUE;
CREATE INDEX idx_offers_type ON offers(foodtruck_id, offer_type);

-- 3. Items lies a une offre (pour bundles, buy_x_get_y)
CREATE TABLE offer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,

  -- Role de l'item dans l'offre
  -- 'trigger': pour buy_x_get_y, l'item qui declenche
  -- 'reward': pour buy_x_get_y, l'item offert
  -- 'bundle_item': pour bundle, un item de la formule
  role TEXT NOT NULL CHECK (role IN ('trigger', 'reward', 'bundle_item')),

  quantity INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offer_items_offer ON offer_items(offer_id);
CREATE INDEX idx_offer_items_menu_item ON offer_items(menu_item_id);

-- 4. Suivi des utilisations
CREATE TABLE offer_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  customer_email TEXT,
  discount_amount INTEGER NOT NULL,  -- Reduction appliquee (centimes)
  free_item_name TEXT,               -- Nom de l'item offert (si applicable)

  used_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(offer_id, order_id)
);

CREATE INDEX idx_offer_uses_offer ON offer_uses(offer_id);
CREATE INDEX idx_offer_uses_customer ON offer_uses(customer_email);
CREATE INDEX idx_offer_uses_order ON offer_uses(order_id);

-- 5. Ajouter colonnes a orders pour offres unifiees
ALTER TABLE orders ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS offer_discount INTEGER DEFAULT 0;

-- ============================================
-- FONCTIONS
-- ============================================

-- 6. Fonction pour valider un code promo (type promo_code)
CREATE OR REPLACE FUNCTION validate_offer_promo_code(
  p_foodtruck_id UUID,
  p_code TEXT,
  p_customer_email TEXT,
  p_order_amount INTEGER
)
RETURNS TABLE (
  is_valid BOOLEAN,
  offer_id UUID,
  discount_type TEXT,
  discount_value INTEGER,
  max_discount INTEGER,
  calculated_discount INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_offer RECORD;
  v_config JSONB;
  v_customer_uses INTEGER;
  v_calculated_discount INTEGER;
BEGIN
  -- Chercher l'offre de type promo_code avec ce code
  SELECT o.*, o.config INTO v_offer
  FROM offers o
  WHERE o.foodtruck_id = p_foodtruck_id
    AND o.offer_type = 'promo_code'
    AND o.is_active = TRUE
    AND UPPER(o.config->>'code') = UPPER(p_code);

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'Code promo invalide'::TEXT;
    RETURN;
  END IF;

  v_config := v_offer.config;

  -- Verifier la validite temporelle
  IF v_offer.start_date IS NOT NULL AND v_offer.start_date > NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'Ce code n''est pas encore actif'::TEXT;
    RETURN;
  END IF;

  IF v_offer.end_date IS NOT NULL AND v_offer.end_date < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'Ce code a expire'::TEXT;
    RETURN;
  END IF;

  -- Verifier le montant minimum
  IF (v_config->>'min_order_amount')::INTEGER IS NOT NULL
     AND p_order_amount < (v_config->>'min_order_amount')::INTEGER THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER,
      ('Commande minimum de ' || ROUND((v_config->>'min_order_amount')::INTEGER / 100.0, 2)::TEXT || ' EUR requise')::TEXT;
    RETURN;
  END IF;

  -- Verifier le nombre max d'utilisations total
  IF v_offer.max_uses IS NOT NULL AND v_offer.current_uses >= v_offer.max_uses THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'Ce code a atteint sa limite d''utilisation'::TEXT;
    RETURN;
  END IF;

  -- Verifier le nombre max par client
  IF v_offer.max_uses_per_customer IS NOT NULL THEN
    SELECT COUNT(*) INTO v_customer_uses
    FROM offer_uses ou
    WHERE ou.offer_id = v_offer.id
      AND LOWER(ou.customer_email) = LOWER(p_customer_email);

    IF v_customer_uses >= v_offer.max_uses_per_customer THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'Vous avez deja utilise ce code'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Calculer la reduction
  IF (v_config->>'discount_type') = 'percentage' THEN
    v_calculated_discount := (p_order_amount * (v_config->>'discount_value')::INTEGER / 100);
    -- Appliquer le max si defini
    IF (v_config->>'max_discount')::INTEGER IS NOT NULL
       AND v_calculated_discount > (v_config->>'max_discount')::INTEGER THEN
      v_calculated_discount := (v_config->>'max_discount')::INTEGER;
    END IF;
  ELSE
    v_calculated_discount := (v_config->>'discount_value')::INTEGER;
    -- Ne pas depasser le montant de la commande
    IF v_calculated_discount > p_order_amount THEN
      v_calculated_discount := p_order_amount;
    END IF;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    v_offer.id,
    v_config->>'discount_type',
    (v_config->>'discount_value')::INTEGER,
    (v_config->>'max_discount')::INTEGER,
    v_calculated_discount,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 7. Fonction pour obtenir les offres applicables
CREATE OR REPLACE FUNCTION get_applicable_offers(
  p_foodtruck_id UUID,
  p_cart_items JSONB,  -- [{"menu_item_id": "uuid", "category_id": "uuid", "quantity": 2, "price": 1000}, ...]
  p_order_amount INTEGER,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  offer_id UUID,
  offer_name TEXT,
  offer_type offer_type,
  calculated_discount INTEGER,
  free_item_name TEXT,
  is_applicable BOOLEAN,
  progress_current INTEGER,
  progress_required INTEGER,
  description TEXT
) AS $$
DECLARE
  v_offer RECORD;
  v_config JSONB;
  v_calculated_discount INTEGER;
  v_free_item_name TEXT;
  v_is_applicable BOOLEAN;
  v_progress_current INTEGER;
  v_progress_required INTEGER;
  v_current_time TIME;
  v_current_dow INTEGER;
  v_trigger_count INTEGER;
  v_category_count INTEGER;
  v_reward_item RECORD;
BEGIN
  v_current_time := CURRENT_TIME;
  v_current_dow := EXTRACT(DOW FROM CURRENT_DATE)::INTEGER;

  -- Parcourir toutes les offres actives du foodtruck
  FOR v_offer IN
    SELECT o.*
    FROM offers o
    WHERE o.foodtruck_id = p_foodtruck_id
      AND o.is_active = TRUE
      AND (o.start_date IS NULL OR o.start_date <= NOW())
      AND (o.end_date IS NULL OR o.end_date >= NOW())
  LOOP
    v_config := v_offer.config;
    v_calculated_discount := 0;
    v_free_item_name := NULL;
    v_is_applicable := FALSE;
    v_progress_current := 0;
    v_progress_required := 0;

    CASE v_offer.offer_type
      -- BUNDLE: prix fixe pour un ensemble d'items
      WHEN 'bundle' THEN
        -- Verifier si tous les items du bundle sont dans le panier
        SELECT COUNT(*) INTO v_trigger_count
        FROM offer_items oi
        WHERE oi.offer_id = v_offer.id
          AND oi.role = 'bundle_item'
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_cart_items) AS item
            WHERE (item->>'menu_item_id')::UUID = oi.menu_item_id
              AND (item->>'quantity')::INTEGER >= oi.quantity
          );

        SELECT COUNT(*) INTO v_progress_required
        FROM offer_items oi WHERE oi.offer_id = v_offer.id AND oi.role = 'bundle_item';

        v_progress_current := v_trigger_count;

        IF v_trigger_count >= v_progress_required THEN
          v_is_applicable := TRUE;
          -- Calculer la difference entre prix normal et prix fixe
          SELECT COALESCE(SUM(
            (item->>'price')::INTEGER * LEAST(
              (item->>'quantity')::INTEGER,
              COALESCE((SELECT oi.quantity FROM offer_items oi
                WHERE oi.offer_id = v_offer.id
                AND oi.menu_item_id = (item->>'menu_item_id')::UUID
                AND oi.role = 'bundle_item'), 0)
            )
          ), 0) - COALESCE((v_config->>'fixed_price')::INTEGER, 0)
          INTO v_calculated_discount
          FROM jsonb_array_elements(p_cart_items) AS item
          WHERE EXISTS (
            SELECT 1 FROM offer_items oi
            WHERE oi.offer_id = v_offer.id
              AND oi.role = 'bundle_item'
              AND oi.menu_item_id = (item->>'menu_item_id')::UUID
          );

          IF v_calculated_discount < 0 THEN
            v_calculated_discount := 0;
          END IF;
        END IF;

      -- BUY_X_GET_Y: X achetes = Y offert
      WHEN 'buy_x_get_y' THEN
        v_progress_required := (v_config->>'trigger_quantity')::INTEGER;

        -- Compter les items trigger dans le panier
        SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0) INTO v_trigger_count
        FROM jsonb_array_elements(p_cart_items) AS item
        WHERE EXISTS (
          SELECT 1 FROM offer_items oi
          WHERE oi.offer_id = v_offer.id
            AND oi.role = 'trigger'
            AND oi.menu_item_id = (item->>'menu_item_id')::UUID
        );

        v_progress_current := v_trigger_count;

        IF v_trigger_count >= v_progress_required THEN
          v_is_applicable := TRUE;

          -- Trouver l'item reward
          SELECT mi.id, mi.name, mi.price INTO v_reward_item
          FROM offer_items oi
          JOIN menu_items mi ON mi.id = oi.menu_item_id
          WHERE oi.offer_id = v_offer.id AND oi.role = 'reward'
          LIMIT 1;

          IF v_reward_item.id IS NOT NULL THEN
            v_free_item_name := v_reward_item.name;
            IF (v_config->>'reward_type') = 'free' THEN
              v_calculated_discount := v_reward_item.price * COALESCE((v_config->>'reward_quantity')::INTEGER, 1);
            ELSE
              v_calculated_discount := COALESCE((v_config->>'reward_value')::INTEGER, 0);
            END IF;
          END IF;
        END IF;

      -- HAPPY_HOUR: reduction sur creneau horaire
      WHEN 'happy_hour' THEN
        -- Verifier l'heure et le jour
        IF (v_offer.time_start IS NULL OR v_current_time >= v_offer.time_start)
           AND (v_offer.time_end IS NULL OR v_current_time <= v_offer.time_end)
           AND (v_offer.days_of_week IS NULL OR v_current_dow = ANY(v_offer.days_of_week)) THEN

          v_is_applicable := TRUE;

          IF (v_config->>'applies_to') = 'category' AND (v_config->>'category_id') IS NOT NULL THEN
            -- Reduction uniquement sur une categorie
            SELECT COALESCE(SUM((item->>'price')::INTEGER * (item->>'quantity')::INTEGER), 0)
            INTO v_category_count
            FROM jsonb_array_elements(p_cart_items) AS item
            WHERE (item->>'category_id')::UUID = (v_config->>'category_id')::UUID;

            IF (v_config->>'discount_type') = 'percentage' THEN
              v_calculated_discount := (v_category_count * (v_config->>'discount_value')::INTEGER / 100);
            ELSE
              v_calculated_discount := LEAST((v_config->>'discount_value')::INTEGER, v_category_count);
            END IF;
          ELSE
            -- Reduction sur tout
            IF (v_config->>'discount_type') = 'percentage' THEN
              v_calculated_discount := (p_order_amount * (v_config->>'discount_value')::INTEGER / 100);
            ELSE
              v_calculated_discount := LEAST((v_config->>'discount_value')::INTEGER, p_order_amount);
            END IF;
          END IF;
        END IF;

      -- PROMO_CODE: traite separement via validate_offer_promo_code
      WHEN 'promo_code' THEN
        IF p_promo_code IS NOT NULL AND UPPER(v_config->>'code') = UPPER(p_promo_code) THEN
          -- Verifier le montant minimum
          IF (v_config->>'min_order_amount')::INTEGER IS NULL
             OR p_order_amount >= (v_config->>'min_order_amount')::INTEGER THEN
            v_is_applicable := TRUE;

            IF (v_config->>'discount_type') = 'percentage' THEN
              v_calculated_discount := (p_order_amount * (v_config->>'discount_value')::INTEGER / 100);
              IF (v_config->>'max_discount')::INTEGER IS NOT NULL
                 AND v_calculated_discount > (v_config->>'max_discount')::INTEGER THEN
                v_calculated_discount := (v_config->>'max_discount')::INTEGER;
              END IF;
            ELSE
              v_calculated_discount := LEAST((v_config->>'discount_value')::INTEGER, p_order_amount);
            END IF;
          END IF;
        END IF;

      -- THRESHOLD_DISCOUNT: remise au palier
      WHEN 'threshold_discount' THEN
        v_progress_required := (v_config->>'min_amount')::INTEGER;
        v_progress_current := p_order_amount;

        IF p_order_amount >= v_progress_required THEN
          v_is_applicable := TRUE;

          IF (v_config->>'discount_type') = 'percentage' THEN
            v_calculated_discount := (p_order_amount * (v_config->>'discount_value')::INTEGER / 100);
          ELSE
            v_calculated_discount := LEAST((v_config->>'discount_value')::INTEGER, p_order_amount);
          END IF;
        END IF;

    END CASE;

    RETURN QUERY SELECT
      v_offer.id,
      v_offer.name,
      v_offer.offer_type,
      v_calculated_discount,
      v_free_item_name,
      v_is_applicable,
      v_progress_current,
      v_progress_required,
      v_offer.description;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. Fonction pour appliquer une offre
CREATE OR REPLACE FUNCTION apply_offer(
  p_offer_id UUID,
  p_order_id UUID,
  p_customer_email TEXT,
  p_discount_amount INTEGER,
  p_free_item_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Enregistrer l'utilisation
  INSERT INTO offer_uses (offer_id, order_id, customer_email, discount_amount, free_item_name)
  VALUES (p_offer_id, p_order_id, p_customer_email, p_discount_amount, p_free_item_name);

  -- Mettre a jour les stats de l'offre
  UPDATE offers SET
    current_uses = current_uses + 1,
    total_discount_given = total_discount_given + p_discount_amount,
    updated_at = NOW()
  WHERE id = p_offer_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_uses ENABLE ROW LEVEL SECURITY;

-- Gestionnaires peuvent gerer leurs offres
CREATE POLICY "Foodtruck owners can manage their offers"
  ON offers FOR ALL
  USING (
    foodtruck_id IN (
      SELECT id FROM foodtrucks WHERE user_id = auth.uid()
    )
  );

-- Lecture publique des offres actives
CREATE POLICY "Anyone can read active offers"
  ON offers FOR SELECT
  USING (is_active = TRUE);

-- Gestionnaires peuvent gerer les items d'offre
CREATE POLICY "Foodtruck owners can manage offer items"
  ON offer_items FOR ALL
  USING (
    offer_id IN (
      SELECT o.id FROM offers o
      JOIN foodtrucks f ON f.id = o.foodtruck_id
      WHERE f.user_id = auth.uid()
    )
  );

-- Lecture publique des items d'offre
CREATE POLICY "Anyone can read offer items"
  ON offer_items FOR SELECT
  USING (true);

-- Gestionnaires peuvent voir les utilisations
CREATE POLICY "Foodtruck owners can view offer uses"
  ON offer_uses FOR SELECT
  USING (
    offer_id IN (
      SELECT o.id FROM offers o
      JOIN foodtrucks f ON f.id = o.foodtruck_id
      WHERE f.user_id = auth.uid()
    )
  );

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL ON offers TO authenticated;
GRANT SELECT ON offers TO anon;
GRANT ALL ON offer_items TO authenticated;
GRANT SELECT ON offer_items TO anon;
GRANT ALL ON offer_uses TO authenticated;

GRANT EXECUTE ON FUNCTION validate_offer_promo_code(UUID, TEXT, TEXT, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_applicable_offers(UUID, JSONB, INTEGER, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION apply_offer(UUID, UUID, TEXT, INTEGER, TEXT) TO authenticated;

-- ============================================
-- MIGRATION DES DONNEES EXISTANTES
-- ============================================

-- Migrer promo_codes vers offers
INSERT INTO offers (
  foodtruck_id, name, description, offer_type, config,
  is_active, start_date, end_date,
  max_uses, max_uses_per_customer, current_uses, total_discount_given,
  created_at, updated_at
)
SELECT
  pc.foodtruck_id,
  'Code promo: ' || pc.code,
  pc.description,
  'promo_code'::offer_type,
  jsonb_build_object(
    'code', pc.code,
    'discount_type', pc.discount_type::TEXT,
    'discount_value', pc.discount_value,
    'min_order_amount', pc.min_order_amount,
    'max_discount', pc.max_discount
  ),
  pc.is_active,
  pc.valid_from,
  pc.valid_until,
  pc.max_uses,
  pc.max_uses_per_customer,
  pc.current_uses,
  pc.total_discount_given,
  pc.created_at,
  pc.updated_at
FROM promo_codes pc;

-- Migrer deals vers offers
INSERT INTO offers (
  foodtruck_id, name, description, offer_type, config,
  is_active, stackable, current_uses, total_discount_given,
  created_at, updated_at
)
SELECT
  d.foodtruck_id,
  d.name,
  d.description,
  'buy_x_get_y'::offer_type,
  jsonb_build_object(
    'trigger_quantity', d.trigger_quantity,
    'reward_quantity', 1,
    'reward_type', CASE d.reward_type
      WHEN 'free_item' THEN 'free'
      WHEN 'cheapest_in_cart' THEN 'free'
      ELSE 'discount'
    END,
    'reward_value', d.reward_value,
    'trigger_category_id', d.trigger_category_id
  ),
  d.is_active,
  d.stackable,
  d.times_used,
  d.total_discount_given,
  d.created_at,
  d.updated_at
FROM deals d;

-- Note: Les offer_items pour les deals migres devront etre crees manuellement
-- car la structure trigger_category_id -> menu_item_id n'est pas directe
