-- ============================================
-- CHANTIER 2.1 — Migration des donnees options
--
-- Duplique les category_option_groups / category_options vers
-- menu_item_option_groups / menu_item_options, en respectant :
--   - les overrides de prix (menu_items.option_prices JSONB)
--   - les desactivations (menu_items.disabled_options JSONB array)
--
-- IDEMPOTENT : verifie l'existence avant chaque insertion via
-- NOT EXISTS sur (menu_item_id, name) pour les groupes et
-- (group_id, name) pour les options.
--
-- Les anciennes tables NE SONT PAS touchees.
-- ============================================

DO $$
DECLARE
  v_cog RECORD;
  v_mi RECORD;
  v_co RECORD;
  v_new_group_id UUID;
  v_is_disabled BOOLEAN;
  v_override_price INTEGER;
  v_final_price_modifier INTEGER;
  v_groups_created INTEGER := 0;
  v_options_created INTEGER := 0;
  v_expected_groups INTEGER;
  v_actual_groups INTEGER;
BEGIN
  -- For each category_option_group
  FOR v_cog IN
    SELECT cog.id, cog.category_id, cog.name, cog.is_required,
           cog.is_multiple, cog.display_order
    FROM category_option_groups cog
    ORDER BY cog.category_id, cog.display_order
  LOOP
    -- For each menu_item in this category
    FOR v_mi IN
      SELECT mi.id, mi.option_prices, mi.disabled_options
      FROM menu_items mi
      WHERE mi.category_id = v_cog.category_id
      ORDER BY mi.display_order
    LOOP
      -- Check idempotence: skip if group already exists for this item
      SELECT miog.id INTO v_new_group_id
      FROM menu_item_option_groups miog
      WHERE miog.menu_item_id = v_mi.id
        AND miog.name = v_cog.name;

      IF v_new_group_id IS NULL THEN
        -- Create the group
        INSERT INTO menu_item_option_groups (menu_item_id, name, is_required, is_multiple, display_order)
        VALUES (v_mi.id, v_cog.name, v_cog.is_required, v_cog.is_multiple, v_cog.display_order)
        RETURNING id INTO v_new_group_id;

        v_groups_created := v_groups_created + 1;
      END IF;

      -- For each option in this group
      FOR v_co IN
        SELECT co.id, co.name, co.price_modifier, co.is_available,
               co.is_default, co.display_order
        FROM category_options co
        WHERE co.option_group_id = v_cog.id
        ORDER BY co.display_order
      LOOP
        -- Check idempotence: skip if option already exists in this group
        IF EXISTS (
          SELECT 1 FROM menu_item_options mio
          WHERE mio.group_id = v_new_group_id
            AND mio.name = v_co.name
        ) THEN
          CONTINUE;
        END IF;

        -- Check if this option is disabled for this item
        -- disabled_options is a JSONB array of option UUIDs as strings
        v_is_disabled := false;
        IF v_mi.disabled_options IS NOT NULL
           AND v_mi.disabled_options != '[]'::jsonb
           AND v_mi.disabled_options @> to_jsonb(v_co.id::text)
        THEN
          v_is_disabled := true;
        END IF;

        -- Check if there is a price override for this option
        -- option_prices is a JSONB object: {"option_uuid": price_in_cents}
        v_override_price := NULL;
        IF v_mi.option_prices IS NOT NULL
           AND v_mi.option_prices != '{}'::jsonb
           AND v_mi.option_prices ? v_co.id::text
        THEN
          v_override_price := (v_mi.option_prices ->> v_co.id::text)::integer;
        END IF;

        -- Determine the final price_modifier
        -- If there's an override, we store it as the price_modifier directly
        -- (the override is an absolute price, but at menu_item level we store
        -- it the same way — as price_modifier. The UI/code that reads from
        -- menu_item_options will interpret it the same way as category_options.)
        IF v_override_price IS NOT NULL THEN
          v_final_price_modifier := v_override_price;
        ELSE
          v_final_price_modifier := v_co.price_modifier;
        END IF;

        -- Create the option
        INSERT INTO menu_item_options (group_id, name, price_modifier, is_available, is_default, display_order)
        VALUES (
          v_new_group_id,
          v_co.name,
          v_final_price_modifier,
          CASE WHEN v_is_disabled THEN false ELSE v_co.is_available END,
          v_co.is_default,
          v_co.display_order
        );

        v_options_created := v_options_created + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Migration complete: % groups created, % options created', v_groups_created, v_options_created;

  -- ============================================
  -- ASSERTIONS
  -- ============================================

  -- Assert 1: Every menu_item that belongs to a category with option groups
  -- must now have the corresponding menu_item_option_groups
  SELECT COUNT(DISTINCT (mi.id, cog.name)) INTO v_expected_groups
  FROM menu_items mi
  JOIN category_option_groups cog ON cog.category_id = mi.category_id;

  SELECT COUNT(*) INTO v_actual_groups
  FROM menu_item_option_groups;

  IF v_expected_groups != v_actual_groups THEN
    RAISE EXCEPTION 'Assertion failed: expected % menu_item_option_groups, got %',
      v_expected_groups, v_actual_groups;
  END IF;

  RAISE NOTICE 'Assertion passed: % menu_item_option_groups match expected count', v_actual_groups;

  -- Assert 2: For items WITHOUT overrides or disabled options,
  -- the option count per group should match the category option count.
  -- We check the total options count matches (items * options_per_group for each group).
  DECLARE
    v_expected_options INTEGER;
    v_actual_options INTEGER;
  BEGIN
    -- Total expected = sum over all (category_option_group, menu_item in that category)
    -- of the number of category_options in that group
    SELECT COUNT(*) INTO v_expected_options
    FROM menu_items mi
    JOIN category_option_groups cog ON cog.category_id = mi.category_id
    JOIN category_options co ON co.option_group_id = cog.id;

    SELECT COUNT(*) INTO v_actual_options
    FROM menu_item_options;

    IF v_expected_options != v_actual_options THEN
      RAISE EXCEPTION 'Assertion failed: expected % menu_item_options, got %',
        v_expected_options, v_actual_options;
    END IF;

    RAISE NOTICE 'Assertion passed: % menu_item_options match expected count', v_actual_options;
  END;
END $$;
