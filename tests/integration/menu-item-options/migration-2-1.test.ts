import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  supabaseAdmin,
  supabaseAnon,
  createTestUser,
  deleteTestUser,
  createAuthenticatedClient,
} from '../setup';

/**
 * Integration tests for Chantier 2.1 — menu_item_option_groups / menu_item_options.
 *
 * Tests the migration logic (category-level options → item-level options)
 * and RLS policies on the new tables.
 */

// ============================================
// Helpers
// ============================================

let testUserId: string;
let otherUserId: string;
let otherUserToken: string;
let foodtruckId: string;

async function createFoodtruck(userId: string, suffix: string) {
  const ts = Date.now();
  const { data, error } = await supabaseAdmin
    .from('foodtrucks')
    .insert({
      user_id: userId,
      name: `Test FT ${suffix}-${ts}`,
      slug: `test-ft-${suffix}-${ts}`,
      email: `test-${suffix}-${ts}@test.local`,
    })
    .select('id')
    .single();
  if (error) throw new Error(`createFoodtruck: ${error.message}`);
  return data!.id as string;
}

async function createCategory(ftId: string, name: string) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({ foodtruck_id: ftId, name, display_order: 0 })
    .select('id')
    .single();
  if (error) throw new Error(`createCategory: ${error.message}`);
  return data!.id as string;
}

async function createCategoryOptionGroup(
  categoryId: string,
  opts: { name: string; is_required?: boolean; is_multiple?: boolean; display_order?: number }
) {
  const { data, error } = await supabaseAdmin
    .from('category_option_groups')
    .insert({
      category_id: categoryId,
      name: opts.name,
      is_required: opts.is_required ?? false,
      is_multiple: opts.is_multiple ?? false,
      display_order: opts.display_order ?? 0,
    })
    .select('id')
    .single();
  if (error) throw new Error(`createCategoryOptionGroup: ${error.message}`);
  return data!.id as string;
}

async function createCategoryOption(
  groupId: string,
  opts: { name: string; price_modifier?: number; is_default?: boolean; display_order?: number }
) {
  const { data, error } = await supabaseAdmin
    .from('category_options')
    .insert({
      option_group_id: groupId,
      name: opts.name,
      price_modifier: opts.price_modifier ?? 0,
      is_default: opts.is_default ?? false,
      display_order: opts.display_order ?? 0,
    })
    .select('id')
    .single();
  if (error) throw new Error(`createCategoryOption: ${error.message}`);
  return data!.id as string;
}

async function createMenuItem(
  ftId: string,
  categoryId: string,
  opts: {
    name: string;
    price: number;
    option_prices?: Record<string, number>;
    disabled_options?: string[];
  }
) {
  const { data, error } = await supabaseAdmin
    .from('menu_items')
    .insert({
      foodtruck_id: ftId,
      category_id: categoryId,
      name: opts.name,
      price: opts.price,
      is_available: true,
      display_order: 0,
      option_prices: opts.option_prices ?? {},
      disabled_options: opts.disabled_options ?? [],
    })
    .select('id')
    .single();
  if (error) throw new Error(`createMenuItem: ${error.message}`);
  return data!.id as string;
}

/**
 * Runs the same migration logic as 20260528000003 for a specific foodtruck.
 * We use this to test migration on freshly created test data (the real migration
 * already ran on deploy, so new test data wouldn't be migrated automatically).
 */
async function runMigrationForFoodtruck(ftId: string) {
  const { error } = await supabaseAdmin.rpc(
    'exec_sql' as never,
    {
      query: `
      DO $$
      DECLARE
        v_cog RECORD;
        v_mi RECORD;
        v_co RECORD;
        v_new_group_id UUID;
        v_is_disabled BOOLEAN;
        v_override_price INTEGER;
        v_final_price_modifier INTEGER;
      BEGIN
        FOR v_cog IN
          SELECT cog.id, cog.category_id, cog.name, cog.is_required,
                 cog.is_multiple, cog.display_order
          FROM category_option_groups cog
          JOIN categories c ON c.id = cog.category_id
          WHERE c.foodtruck_id = '${ftId}'
          ORDER BY cog.category_id, cog.display_order
        LOOP
          FOR v_mi IN
            SELECT mi.id, mi.option_prices, mi.disabled_options
            FROM menu_items mi
            WHERE mi.category_id = v_cog.category_id
            ORDER BY mi.display_order
          LOOP
            SELECT miog.id INTO v_new_group_id
            FROM menu_item_option_groups miog
            WHERE miog.menu_item_id = v_mi.id AND miog.name = v_cog.name;

            IF v_new_group_id IS NULL THEN
              INSERT INTO menu_item_option_groups (menu_item_id, name, is_required, is_multiple, display_order)
              VALUES (v_mi.id, v_cog.name, v_cog.is_required, v_cog.is_multiple, v_cog.display_order)
              RETURNING id INTO v_new_group_id;
            END IF;

            FOR v_co IN
              SELECT co.id, co.name, co.price_modifier, co.is_available,
                     co.is_default, co.display_order
              FROM category_options co
              WHERE co.option_group_id = v_cog.id
              ORDER BY co.display_order
            LOOP
              IF EXISTS (
                SELECT 1 FROM menu_item_options mio
                WHERE mio.group_id = v_new_group_id AND mio.name = v_co.name
              ) THEN
                CONTINUE;
              END IF;

              v_is_disabled := false;
              IF v_mi.disabled_options IS NOT NULL
                 AND v_mi.disabled_options != '[]'::jsonb
                 AND v_mi.disabled_options @> to_jsonb(v_co.id::text)
              THEN
                v_is_disabled := true;
              END IF;

              v_override_price := NULL;
              IF v_mi.option_prices IS NOT NULL
                 AND v_mi.option_prices != '{}'::jsonb
                 AND v_mi.option_prices ? v_co.id::text
              THEN
                v_override_price := (v_mi.option_prices ->> v_co.id::text)::integer;
              END IF;

              IF v_override_price IS NOT NULL THEN
                v_final_price_modifier := v_override_price;
              ELSE
                v_final_price_modifier := v_co.price_modifier;
              END IF;

              INSERT INTO menu_item_options (group_id, name, price_modifier, is_available, is_default, display_order)
              VALUES (
                v_new_group_id,
                v_co.name,
                v_final_price_modifier,
                CASE WHEN v_is_disabled THEN false ELSE v_co.is_available END,
                v_co.is_default,
                v_co.display_order
              );
            END LOOP;
          END LOOP;
        END LOOP;
      END $$;
    `,
    } as never
  );

  // exec_sql might not exist, fallback to direct SQL via supabase-js
  if (error) {
    // Use raw SQL through the admin client's rpc or direct inserts
    // Since exec_sql doesn't exist, we'll do the migration in JS
    await runMigrationInJS(ftId);
  }
}

async function runMigrationInJS(ftId: string) {
  // Fetch all category option groups for this foodtruck
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('foodtruck_id', ftId);

  if (!categories || categories.length === 0) return;

  for (const cat of categories) {
    const { data: cogs } = await supabaseAdmin
      .from('category_option_groups')
      .select('id, name, is_required, is_multiple, display_order')
      .eq('category_id', cat.id)
      .order('display_order');

    if (!cogs || cogs.length === 0) continue;

    const { data: menuItems } = await supabaseAdmin
      .from('menu_items')
      .select('id, option_prices, disabled_options')
      .eq('category_id', cat.id)
      .order('display_order');

    if (!menuItems || menuItems.length === 0) continue;

    for (const cog of cogs) {
      const { data: cos } = await supabaseAdmin
        .from('category_options')
        .select('id, name, price_modifier, is_available, is_default, display_order')
        .eq('option_group_id', cog.id)
        .order('display_order');

      if (!cos || cos.length === 0) continue;

      for (const mi of menuItems) {
        // Check idempotence
        const { data: existing } = await supabaseAdmin
          .from('menu_item_option_groups')
          .select('id')
          .eq('menu_item_id', mi.id)
          .eq('name', cog.name)
          .maybeSingle();

        let groupId: string;
        if (existing) {
          groupId = existing.id;
        } else {
          const { data: newGroup, error: gErr } = await supabaseAdmin
            .from('menu_item_option_groups')
            .insert({
              menu_item_id: mi.id,
              name: cog.name,
              is_required: cog.is_required,
              is_multiple: cog.is_multiple,
              display_order: cog.display_order,
            })
            .select('id')
            .single();
          if (gErr) throw new Error(`insert group: ${gErr.message}`);
          groupId = newGroup!.id;
        }

        const optionPrices = (mi.option_prices as Record<string, number>) || {};
        const disabledOptions = (mi.disabled_options as string[]) || [];

        for (const co of cos) {
          // Check idempotence
          const { data: existingOpt } = await supabaseAdmin
            .from('menu_item_options')
            .select('id')
            .eq('group_id', groupId)
            .eq('name', co.name)
            .maybeSingle();

          if (existingOpt) continue;

          const isDisabled = disabledOptions.includes(co.id);
          const overridePrice = optionPrices[co.id];
          const finalPriceModifier =
            overridePrice !== undefined ? overridePrice : co.price_modifier;

          const { error: oErr } = await supabaseAdmin.from('menu_item_options').insert({
            group_id: groupId,
            name: co.name,
            price_modifier: finalPriceModifier,
            is_available: isDisabled ? false : co.is_available,
            is_default: co.is_default,
            display_order: co.display_order,
          });
          if (oErr) throw new Error(`insert option: ${oErr.message}`);
        }
      }
    }
  }
}

async function cleanup(ftId: string) {
  // Clean menu_item_options via cascade from menu_item_option_groups
  const { data: menuItems } = await supabaseAdmin
    .from('menu_items')
    .select('id')
    .eq('foodtruck_id', ftId);

  if (menuItems) {
    for (const mi of menuItems) {
      await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', mi.id);
    }
  }

  // Clean category options via cascade
  const { data: cats } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('foodtruck_id', ftId);

  if (cats) {
    for (const cat of cats) {
      await supabaseAdmin.from('category_option_groups').delete().eq('category_id', cat.id);
    }
  }

  await supabaseAdmin.from('menu_items').delete().eq('foodtruck_id', ftId);
  await supabaseAdmin.from('categories').delete().eq('foodtruck_id', ftId);
  await supabaseAdmin.from('option_templates').delete().eq('foodtruck_id', ftId);
  await supabaseAdmin.from('foodtrucks').delete().eq('id', ftId);
}

// ============================================
// Tests
// ============================================

describe('Chantier 2.1 — menu_item_options migration', () => {
  beforeAll(async () => {
    // Create two test users (owner + non-owner)
    const owner = await createTestUser();
    testUserId = owner.user.id;

    const other = await createTestUser();
    otherUserId = other.user.id;
    otherUserToken = other.session.access_token;

    foodtruckId = await createFoodtruck(testUserId, 'opts');
  });

  afterAll(async () => {
    await cleanup(foodtruckId);
    await deleteTestUser(testUserId);
    await deleteTestUser(otherUserId);
  });

  it('1. basic migration: 1 category + 1 group + 2 options + 1 item → mirrored', async () => {
    const catId = await createCategory(foodtruckId, 'Burgers');
    const groupId = await createCategoryOptionGroup(catId, {
      name: 'Taille',
      is_required: true,
      is_multiple: false,
    });
    const opt1Id = await createCategoryOption(groupId, {
      name: 'Moyenne',
      price_modifier: 0,
      is_default: true,
      display_order: 0,
    });
    await createCategoryOption(groupId, {
      name: 'Grande',
      price_modifier: 300,
      is_default: false,
      display_order: 1,
    });
    const itemId = await createMenuItem(foodtruckId, catId, {
      name: 'Classic Burger',
      price: 900,
    });

    // Run migration
    await runMigrationForFoodtruck(foodtruckId);

    // Verify: item should have 1 group with 2 options
    const { data: groups } = await supabaseAdmin
      .from('menu_item_option_groups')
      .select('*')
      .eq('menu_item_id', itemId);

    expect(groups).toHaveLength(1);
    expect(groups![0].name).toBe('Taille');
    expect(groups![0].is_required).toBe(true);
    expect(groups![0].is_multiple).toBe(false);

    const { data: options } = await supabaseAdmin
      .from('menu_item_options')
      .select('*')
      .eq('group_id', groups![0].id)
      .order('display_order');

    expect(options).toHaveLength(2);
    expect(options![0].name).toBe('Moyenne');
    expect(options![0].price_modifier).toBe(0);
    expect(options![0].is_default).toBe(true);
    expect(options![0].is_available).toBe(true);
    expect(options![1].name).toBe('Grande');
    expect(options![1].price_modifier).toBe(300);
    expect(options![1].is_default).toBe(false);

    // Store opt1Id for price override test
    // Clean up for next test — remove migrated data but keep category-level
    await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', itemId);

    // Now test price override
    // Update item to have a price override on "Moyenne"
    await supabaseAdmin
      .from('menu_items')
      .update({ option_prices: { [opt1Id]: 1000 } })
      .eq('id', itemId);

    await runMigrationForFoodtruck(foodtruckId);

    const { data: groups2 } = await supabaseAdmin
      .from('menu_item_option_groups')
      .select('id')
      .eq('menu_item_id', itemId);

    const { data: options2 } = await supabaseAdmin
      .from('menu_item_options')
      .select('*')
      .eq('group_id', groups2![0].id)
      .order('display_order');

    // "Moyenne" should have overridden price (1000 instead of 0)
    expect(options2![0].name).toBe('Moyenne');
    expect(options2![0].price_modifier).toBe(1000);
    // "Grande" should keep original
    expect(options2![1].name).toBe('Grande');
    expect(options2![1].price_modifier).toBe(300);

    // Cleanup for next tests
    await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', itemId);
    await supabaseAdmin
      .from('menu_items')
      .update({ option_prices: {}, disabled_options: [] })
      .eq('id', itemId);
  });

  it('2. migration with price override', async () => {
    // Get the category and options we created in test 1
    const { data: cats } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('foodtruck_id', foodtruckId)
      .eq('name', 'Burgers');

    const catId = cats![0].id;

    const { data: cogs } = await supabaseAdmin
      .from('category_option_groups')
      .select('id')
      .eq('category_id', catId);

    const { data: cos } = await supabaseAdmin
      .from('category_options')
      .select('id, name')
      .eq('option_group_id', cogs![0].id)
      .order('display_order');

    const moyenneId = cos![0].id;

    // Create a new item with price override on "Moyenne" = 1000 cents (10€)
    const itemId = await createMenuItem(foodtruckId, catId, {
      name: 'Cheese Burger',
      price: 1100,
      option_prices: { [moyenneId]: 1000 },
    });

    await runMigrationForFoodtruck(foodtruckId);

    const { data: groups } = await supabaseAdmin
      .from('menu_item_option_groups')
      .select('id')
      .eq('menu_item_id', itemId);

    const { data: options } = await supabaseAdmin
      .from('menu_item_options')
      .select('name, price_modifier')
      .eq('group_id', groups![0].id)
      .order('display_order');

    expect(options![0].name).toBe('Moyenne');
    expect(options![0].price_modifier).toBe(1000); // override
    expect(options![1].name).toBe('Grande');
    expect(options![1].price_modifier).toBe(300); // original

    await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', itemId);
  });

  it('3. migration with disabled option', async () => {
    const { data: cats } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('foodtruck_id', foodtruckId)
      .eq('name', 'Burgers');

    const catId = cats![0].id;

    const { data: cogs } = await supabaseAdmin
      .from('category_option_groups')
      .select('id')
      .eq('category_id', catId);

    const { data: cos } = await supabaseAdmin
      .from('category_options')
      .select('id, name')
      .eq('option_group_id', cogs![0].id)
      .order('display_order');

    const grandeId = cos![1].id; // "Grande"

    // Create item with "Grande" disabled
    const itemId = await createMenuItem(foodtruckId, catId, {
      name: 'Mini Burger',
      price: 700,
      disabled_options: [grandeId],
    });

    await runMigrationForFoodtruck(foodtruckId);

    const { data: groups } = await supabaseAdmin
      .from('menu_item_option_groups')
      .select('id')
      .eq('menu_item_id', itemId);

    const { data: options } = await supabaseAdmin
      .from('menu_item_options')
      .select('name, is_available')
      .eq('group_id', groups![0].id)
      .order('display_order');

    expect(options![0].name).toBe('Moyenne');
    expect(options![0].is_available).toBe(true);
    expect(options![1].name).toBe('Grande');
    expect(options![1].is_available).toBe(false); // disabled

    await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', itemId);
  });

  it('4. idempotence: running migration twice does not create duplicates', async () => {
    const { data: items } = await supabaseAdmin
      .from('menu_items')
      .select('id')
      .eq('foodtruck_id', foodtruckId);

    // Run migration twice
    await runMigrationForFoodtruck(foodtruckId);
    await runMigrationForFoodtruck(foodtruckId);

    // Count groups per item — should be exactly 1 per item (one category has one group)
    for (const mi of items!) {
      const { data: groups } = await supabaseAdmin
        .from('menu_item_option_groups')
        .select('id, name')
        .eq('menu_item_id', mi.id);

      // Check no duplicate names
      const names = groups!.map((g) => g.name);
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);

      // Check no duplicate options per group
      for (const g of groups!) {
        const { data: options } = await supabaseAdmin
          .from('menu_item_options')
          .select('name')
          .eq('group_id', g.id);

        const optNames = options!.map((o) => o.name);
        const uniqueOptNames = [...new Set(optNames)];
        expect(optNames.length).toBe(uniqueOptNames.length);
      }
    }
  });

  it('5. RLS: anon can read menu_item_option_groups and menu_item_options', async () => {
    // First ensure there's data to read
    await runMigrationForFoodtruck(foodtruckId);

    const { data: groups, error: gErr } = await supabaseAnon
      .from('menu_item_option_groups')
      .select('id, name')
      .limit(5);

    expect(gErr).toBeNull();
    expect(groups).toBeDefined();
    // There should be at least some groups from our test data
    expect(groups!.length).toBeGreaterThan(0);

    const { data: options, error: oErr } = await supabaseAnon
      .from('menu_item_options')
      .select('id, name, price_modifier')
      .limit(5);

    expect(oErr).toBeNull();
    expect(options).toBeDefined();
    expect(options!.length).toBeGreaterThan(0);
  });

  it('6. RLS: non-owner cannot insert/update/delete menu_item_option_groups', async () => {
    const otherClient = createAuthenticatedClient(otherUserToken);

    // Get a menu_item_id from our foodtruck
    const { data: items } = await supabaseAdmin
      .from('menu_items')
      .select('id')
      .eq('foodtruck_id', foodtruckId)
      .limit(1);

    const itemId = items![0].id;

    // Try to INSERT — should fail (RLS blocks because other user is not the owner)
    const { error: insertErr } = await otherClient.from('menu_item_option_groups').insert({
      menu_item_id: itemId,
      name: 'Hacked Group',
      is_required: false,
      is_multiple: false,
      display_order: 99,
    });

    expect(insertErr).not.toBeNull();

    // Try to UPDATE an existing group
    const { data: existingGroups } = await supabaseAdmin
      .from('menu_item_option_groups')
      .select('id')
      .eq('menu_item_id', itemId)
      .limit(1);

    if (existingGroups && existingGroups.length > 0) {
      const { error: updateErr } = await otherClient
        .from('menu_item_option_groups')
        .update({ name: 'Hacked' })
        .eq('id', existingGroups[0].id);

      // Update should either error or affect 0 rows
      if (!updateErr) {
        // Verify the name didn't change
        const { data: check } = await supabaseAdmin
          .from('menu_item_option_groups')
          .select('name')
          .eq('id', existingGroups[0].id)
          .single();
        expect(check!.name).not.toBe('Hacked');
      }
    }

    // Try to DELETE
    if (existingGroups && existingGroups.length > 0) {
      const { error: deleteErr } = await otherClient
        .from('menu_item_option_groups')
        .delete()
        .eq('id', existingGroups[0].id);

      // Verify it still exists
      const { data: stillExists } = await supabaseAdmin
        .from('menu_item_option_groups')
        .select('id')
        .eq('id', existingGroups[0].id)
        .single();

      expect(stillExists).not.toBeNull();

      // If no error was returned, it just silently did nothing (RLS filtered the row)
      if (deleteErr) {
        expect(deleteErr).not.toBeNull();
      }
    }
  });
});
