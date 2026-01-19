-- ============================================
-- OPT-IN PROGRAMME DE FIDÉLITÉ (RGPD)
-- Consentement explicite pour le suivi des points
-- ============================================

-- Ajouter le consentement fidélité aux clients
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_opt_in BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_opted_in_at TIMESTAMPTZ;

-- Mettre à jour la fonction qui crédite les points pour vérifier l'opt-in
CREATE OR REPLACE FUNCTION credit_loyalty_on_order_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_foodtruck RECORD;
  v_customer RECORD;
BEGIN
  -- Seulement pour les commandes cash (les cartes sont gérées par le webhook Stripe)
  IF NEW.payment_method != 'cash' THEN
    RETURN NEW;
  END IF;

  -- Récupérer les paramètres fidélité du foodtruck
  SELECT loyalty_enabled, loyalty_points_per_euro
  INTO v_foodtruck
  FROM foodtrucks
  WHERE id = NEW.foodtruck_id;

  IF NOT FOUND OR NOT v_foodtruck.loyalty_enabled THEN
    RETURN NEW;
  END IF;

  -- Trouver le client et vérifier l'opt-in
  SELECT id, loyalty_opt_in INTO v_customer
  FROM customers
  WHERE foodtruck_id = NEW.foodtruck_id
    AND email = LOWER(TRIM(NEW.customer_email));

  IF v_customer.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ne créditer que si le client a opté pour la fidélité
  IF NOT COALESCE(v_customer.loyalty_opt_in, FALSE) THEN
    RETURN NEW;
  END IF;

  -- Créditer les points
  PERFORM credit_loyalty_points(
    v_customer.id,
    NEW.id,
    NEW.total_amount,
    v_foodtruck.loyalty_points_per_euro
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
