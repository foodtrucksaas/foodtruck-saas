-- ============================================
-- Fix: add price_mode to menu_item_option_groups
-- and recalculate all menu_item_options.price_modifier
-- from source tables (category_option_groups, category_options,
-- menu_items.price, menu_items.option_prices).
--
-- The 2.1 migration (20260528000003) incorrectly mixed absolute
-- prices and modifiers in the same price_modifier column.
-- This migration:
--   1. Adds price_mode ('absolute'|'modifier') to groups
--   2. Recalculates all prices from the source-of-truth tables
--   3. Asserts price equivalence with the old model
--
-- IDEMPOTENT: can be re-run safely (UPDATE is deterministic).
-- ============================================

-- ============================================
-- STEP 1: Add price_mode column
-- ============================================

ALTER TABLE menu_item_option_groups
ADD COLUMN IF NOT EXISTS price_mode TEXT NOT NULL DEFAULT 'modifier'
CHECK (price_mode IN ('absolute', 'modifier'));

COMMENT ON COLUMN menu_item_option_groups.price_mode IS
'absolute = each option carries the final price (e.g. Taille). modifier = each option adds its amount to the base price (e.g. Supplements).';

-- ============================================
-- STEP 2: Recalculate from source tables
-- ============================================

DO $$
DECLARE
  v_cat RECORD;
  v_cog RECORD;
  v_first_required_group_id UUID;
  v_mi RECORD;
  v_co RECORD;
  v_migog RECORD;
  v_mio RECORD;
  v_override_price INTEGER;
  v_final_price INTEGER;
  v_is_disabled BOOLEAN;
  v_groups_absolute INTEGER := 0;
  v_groups_modifier INTEGER := 0;
  v_persize_flattened INTEGER := 0;
  v_options_updated INTEGER := 0;
BEGIN
  -- For each category that has option groups
  FOR v_cat IN
    SELECT DISTINCT c.id AS category_id
    FROM categories c
    JOIN category_option_groups cog ON cog.category_id = c.id
  LOOP
    -- Determine the "size group" for this category:
    -- first required single-select group, sorted by display_order
    -- (same logic as client OptionsModal.tsx L33-37)
    SELECT cog.id INTO v_first_required_group_id
    FROM category_option_groups cog
    WHERE cog.category_id = v_cat.category_id
      AND cog.is_required = true
      AND cog.is_multiple = false
    ORDER BY cog.display_order ASC
    LIMIT 1;

    -- For each category_option_group in this category
    FOR v_cog IN
      SELECT cog.id, cog.name, cog.is_required, cog.is_multiple, cog.display_order
      FROM category_option_groups cog
      WHERE cog.category_id = v_cat.category_id
      ORDER BY cog.display_order
    LOOP
      -- For each menu_item in this category
      FOR v_mi IN
        SELECT mi.id, mi.price, mi.option_prices, mi.disabled_options
        FROM menu_items mi
        WHERE mi.category_id = v_cat.category_id
        ORDER BY mi.display_order
      LOOP
        -- Find the corresponding menu_item_option_group
        SELECT migog.id INTO v_migog
        FROM menu_item_option_groups migog
        WHERE migog.menu_item_id = v_mi.id
          AND migog.name = v_cog.name;

        IF v_migog.id IS NULL THEN
          CONTINUE; -- No migrated group found, skip
        END IF;

        -- Set price_mode
        IF v_cog.id = v_first_required_group_id THEN
          UPDATE menu_item_option_groups
          SET price_mode = 'absolute'
          WHERE id = v_migog.id AND price_mode != 'absolute';

          v_groups_absolute := v_groups_absolute + 1;

          -- For each option in this SIZE group: compute absolute price
          FOR v_co IN
            SELECT co.id, co.name, co.price_modifier, co.is_available,
                   co.is_default, co.display_order
            FROM category_options co
            WHERE co.option_group_id = v_cog.id
            ORDER BY co.display_order
          LOOP
            -- Find corresponding menu_item_option
            SELECT mio.id INTO v_mio
            FROM menu_item_options mio
            WHERE mio.group_id = v_migog.id
              AND mio.name = v_co.name;

            IF v_mio.id IS NULL THEN
              CONTINUE;
            END IF;

            -- Check for override (absolute price already)
            v_override_price := NULL;
            IF v_mi.option_prices IS NOT NULL
               AND v_mi.option_prices != '{}'::jsonb
               AND v_mi.option_prices ? v_co.id::text
            THEN
              v_override_price := (v_mi.option_prices ->> v_co.id::text)::integer;
            END IF;

            IF v_override_price IS NOT NULL THEN
              v_final_price := v_override_price; -- Already absolute
            ELSE
              -- Convert delta to absolute: base_price + delta
              v_final_price := v_mi.price + v_co.price_modifier;
            END IF;

            -- Check disabled
            v_is_disabled := false;
            IF v_mi.disabled_options IS NOT NULL
               AND v_mi.disabled_options != '[]'::jsonb
               AND v_mi.disabled_options @> to_jsonb(v_co.id::text)
            THEN
              v_is_disabled := true;
            END IF;

            UPDATE menu_item_options
            SET price_modifier = v_final_price,
                is_available = CASE WHEN v_is_disabled THEN false ELSE v_co.is_available END
            WHERE id = v_mio.id;

            v_options_updated := v_options_updated + 1;
          END LOOP;

        ELSE
          -- Non-size group: price_mode = 'modifier'
          UPDATE menu_item_option_groups
          SET price_mode = 'modifier'
          WHERE id = v_migog.id AND price_mode != 'modifier';

          v_groups_modifier := v_groups_modifier + 1;

          -- For each option: use override or original modifier
          FOR v_co IN
            SELECT co.id, co.name, co.price_modifier, co.is_available,
                   co.is_default, co.display_order
            FROM category_options co
            WHERE co.option_group_id = v_cog.id
            ORDER BY co.display_order
          LOOP
            SELECT mio.id INTO v_mio
            FROM menu_item_options mio
            WHERE mio.group_id = v_migog.id
              AND mio.name = v_co.name;

            IF v_mio.id IS NULL THEN
              CONTINUE;
            END IF;

            -- Check for flat override first
            v_override_price := NULL;
            IF v_mi.option_prices IS NOT NULL
               AND v_mi.option_prices != '{}'::jsonb
               AND v_mi.option_prices ? v_co.id::text
            THEN
              v_override_price := (v_mi.option_prices ->> v_co.id::text)::integer;
            END IF;

            -- Check for per-size override: take the max size price
            -- (flattening per-size to single value)
            IF v_override_price IS NULL
               AND v_mi.option_prices IS NOT NULL
               AND v_mi.option_prices != '{}'::jsonb
            THEN
              DECLARE
                v_key TEXT;
                v_val INTEGER;
                v_max_persize INTEGER := NULL;
                v_found_persize BOOLEAN := false;
              BEGIN
                FOR v_key IN
                  SELECT jsonb_object_keys(v_mi.option_prices)
                LOOP
                  IF v_key LIKE v_co.id::text || ':%' THEN
                    v_val := (v_mi.option_prices ->> v_key)::integer;
                    v_found_persize := true;
                    IF v_max_persize IS NULL OR v_val > v_max_persize THEN
                      v_max_persize := v_val;
                    END IF;
                  END IF;
                END LOOP;

                IF v_found_persize THEN
                  v_override_price := v_max_persize;
                  v_persize_flattened := v_persize_flattened + 1;
                END IF;
              END;
            END IF;

            IF v_override_price IS NOT NULL THEN
              v_final_price := v_override_price;
            ELSE
              v_final_price := v_co.price_modifier;
            END IF;

            -- Check disabled
            v_is_disabled := false;
            IF v_mi.disabled_options IS NOT NULL
               AND v_mi.disabled_options != '[]'::jsonb
               AND v_mi.disabled_options @> to_jsonb(v_co.id::text)
            THEN
              v_is_disabled := true;
            END IF;

            UPDATE menu_item_options
            SET price_modifier = v_final_price,
                is_available = CASE WHEN v_is_disabled THEN false ELSE v_co.is_available END
            WHERE id = v_mio.id;

            v_options_updated := v_options_updated + 1;
          END LOOP;
        END IF;

      END LOOP; -- menu_items
    END LOOP; -- category_option_groups
  END LOOP; -- categories

  RAISE NOTICE 'price_mode fix: % absolute groups, % modifier groups, % options updated, % per-size cases flattened',
    v_groups_absolute, v_groups_modifier, v_options_updated, v_persize_flattened;

  -- ============================================
  -- STEP 3: Price equivalence assertions
  -- ============================================
  -- For each menu_item that has a size group (absolute):
  -- verify that the default size option price matches what the old model would compute.
  DECLARE
    v_assert_mi RECORD;
    v_assert_migog RECORD;
    v_old_price INTEGER;
    v_new_price INTEGER;
    v_assert_cog_id UUID;
    v_assert_co RECORD;
    v_errors INTEGER := 0;
  BEGIN
    FOR v_assert_mi IN
      SELECT mi.id, mi.price, mi.option_prices, mi.category_id
      FROM menu_items mi
      WHERE mi.category_id IS NOT NULL
        AND mi.is_archived = false
    LOOP
      -- Find the first required group for this item's category
      SELECT cog.id INTO v_assert_cog_id
      FROM category_option_groups cog
      WHERE cog.category_id = v_assert_mi.category_id
        AND cog.is_required = true
        AND cog.is_multiple = false
      ORDER BY cog.display_order ASC
      LIMIT 1;

      IF v_assert_cog_id IS NULL THEN
        CONTINUE; -- No size group, skip
      END IF;

      -- Find the default option (or first available) in the category group
      SELECT co.id, co.name, co.price_modifier, co.is_default INTO v_assert_co
      FROM category_options co
      WHERE co.option_group_id = v_assert_cog_id
        AND co.is_available = true
      ORDER BY co.is_default DESC, co.display_order ASC
      LIMIT 1;

      IF v_assert_co.id IS NULL THEN
        CONTINUE; -- No options
      END IF;

      -- OLD MODEL: price for this option
      IF v_assert_mi.option_prices IS NOT NULL
         AND v_assert_mi.option_prices != '{}'::jsonb
         AND v_assert_mi.option_prices ? v_assert_co.id::text
      THEN
        -- Override: absolute price
        v_old_price := (v_assert_mi.option_prices ->> v_assert_co.id::text)::integer;
      ELSE
        -- No override: base price + modifier
        v_old_price := v_assert_mi.price + v_assert_co.price_modifier;
      END IF;

      -- NEW MODEL: find the menu_item_option with price_mode='absolute'
      SELECT migog.id INTO v_assert_migog
      FROM menu_item_option_groups migog
      WHERE migog.menu_item_id = v_assert_mi.id
        AND migog.price_mode = 'absolute'
      ORDER BY migog.display_order ASC
      LIMIT 1;

      IF v_assert_migog.id IS NULL THEN
        CONTINUE; -- Group not found (shouldn't happen)
      END IF;

      SELECT mio.price_modifier INTO v_new_price
      FROM menu_item_options mio
      WHERE mio.group_id = v_assert_migog.id
        AND mio.name = v_assert_co.name;

      IF v_new_price IS NULL THEN
        CONTINUE;
      END IF;

      IF v_old_price != v_new_price THEN
        v_errors := v_errors + 1;
        RAISE WARNING 'Price mismatch for item % option "%": old=% new=%',
          v_assert_mi.id, v_assert_co.name, v_old_price, v_new_price;
      END IF;
    END LOOP;

    IF v_errors > 0 THEN
      RAISE EXCEPTION 'Price equivalence check failed: % mismatches found. See warnings above.', v_errors;
    END IF;

    RAISE NOTICE 'Price equivalence check passed for all items with size groups.';
  END;
END $$;
