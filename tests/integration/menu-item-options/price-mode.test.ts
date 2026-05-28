import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabaseAdmin, createTestUser, deleteTestUser } from '../setup';

/**
 * Integration tests for price_mode migration fix (20260528000005).
 *
 * Tests that:
 * - Size groups get price_mode='absolute' with correct absolute prices
 * - Supplement groups get price_mode='modifier' with correct modifiers
 * - Two required groups: only the first (Taille) is absolute
 * - Price equivalence between old and new models
 */

let testUserId: string;
let foodtruckId: string;

// ============================================
// Helpers
// ============================================

async function createFoodtruck(userId: string) {
  const ts = Date.now();
  const { data, error } = await supabaseAdmin
    .from('foodtrucks')
    .insert({
      user_id: userId,
      name: `Test FT pricemode-${ts}`,
      slug: `test-ft-pricemode-${ts}`,
      email: `test-pricemode-${ts}@test.local`,
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
 * Runs the 2.1 migration logic (category→item) then the 2.1-fix logic
 * (price_mode + price recalculation) for test data created after migrations ran.
 */
async function runMigrationAndFix(ftId: string) {
  // Step 1: Run the 2.1 migration (create menu_item_option_groups/options)
  await runMigration21(ftId);
  // Step 2: Run the fix (set price_mode + recalculate prices from sources)
  await runPriceModeFix(ftId);
}

async function runMigration21(ftId: string) {
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
      .select('id, price, option_prices, disabled_options')
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

/**
 * Reproduces the logic of 20260528000005 in JS for test data.
 */
async function runPriceModeFix(ftId: string) {
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('foodtruck_id', ftId);

  if (!categories) return;

  let persizeFlattened = 0;

  for (const cat of categories) {
    // Find the "size group" (first required single-select)
    const { data: requiredGroups } = await supabaseAdmin
      .from('category_option_groups')
      .select('id')
      .eq('category_id', cat.id)
      .eq('is_required', true)
      .eq('is_multiple', false)
      .order('display_order')
      .limit(1);

    const sizeGroupId = requiredGroups && requiredGroups.length > 0 ? requiredGroups[0].id : null;

    const { data: cogs } = await supabaseAdmin
      .from('category_option_groups')
      .select('id, name, display_order')
      .eq('category_id', cat.id)
      .order('display_order');

    if (!cogs) continue;

    const { data: menuItems } = await supabaseAdmin
      .from('menu_items')
      .select('id, price, option_prices, disabled_options')
      .eq('category_id', cat.id);

    if (!menuItems) continue;

    for (const cog of cogs) {
      const isAbsolute = cog.id === sizeGroupId;

      const { data: cos } = await supabaseAdmin
        .from('category_options')
        .select('id, name, price_modifier, is_available')
        .eq('option_group_id', cog.id)
        .order('display_order');

      if (!cos) continue;

      for (const mi of menuItems) {
        const optionPrices = (mi.option_prices as Record<string, number>) || {};
        const disabledOptions = (mi.disabled_options as string[]) || [];

        // Find migrated group
        const { data: migog } = await supabaseAdmin
          .from('menu_item_option_groups')
          .select('id')
          .eq('menu_item_id', mi.id)
          .eq('name', cog.name)
          .maybeSingle();

        if (!migog) continue;

        // Set price_mode
        await supabaseAdmin
          .from('menu_item_option_groups')
          .update({ price_mode: isAbsolute ? 'absolute' : 'modifier' })
          .eq('id', migog.id);

        for (const co of cos) {
          const { data: mio } = await supabaseAdmin
            .from('menu_item_options')
            .select('id')
            .eq('group_id', migog.id)
            .eq('name', co.name)
            .maybeSingle();

          if (!mio) continue;

          const isDisabled = disabledOptions.includes(co.id);

          let finalPrice: number;

          if (isAbsolute) {
            // Size group: compute absolute price
            const override = optionPrices[co.id];
            if (override !== undefined) {
              finalPrice = override;
            } else {
              finalPrice = mi.price + co.price_modifier;
            }
          } else {
            // Modifier group: check flat override, then per-size, then default
            const flatOverride = optionPrices[co.id];
            if (flatOverride !== undefined) {
              finalPrice = flatOverride;
            } else {
              // Check per-size keys (optId:sizeId) — take max
              let maxPersize: number | null = null;
              for (const [key, val] of Object.entries(optionPrices)) {
                if (key.startsWith(`${co.id}:`)) {
                  if (maxPersize === null || val > maxPersize) {
                    maxPersize = val;
                  }
                  persizeFlattened++;
                }
              }
              if (maxPersize !== null) {
                finalPrice = maxPersize;
              } else {
                finalPrice = co.price_modifier;
              }
            }
          }

          await supabaseAdmin
            .from('menu_item_options')
            .update({
              price_modifier: finalPrice,
              is_available: isDisabled ? false : co.is_available,
            })
            .eq('id', mio.id);
        }
      }
    }
  }

  return { persizeFlattened };
}

async function cleanup(ftId: string) {
  const { data: menuItems } = await supabaseAdmin
    .from('menu_items')
    .select('id')
    .eq('foodtruck_id', ftId);

  if (menuItems) {
    for (const mi of menuItems) {
      await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', mi.id);
    }
  }

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

describe('price_mode migration fix', () => {
  beforeAll(async () => {
    const owner = await createTestUser();
    testUserId = owner.user.id;
    foodtruckId = await createFoodtruck(testUserId);
  });

  afterAll(async () => {
    await cleanup(foodtruckId);
    await deleteTestUser(testUserId);
  });

  it('1. size group with override → price_mode=absolute, prices correct', async () => {
    const catId = await createCategory(foodtruckId, 'Pizzas');
    const sizeGroupId = await createCategoryOptionGroup(catId, {
      name: 'Taille',
      is_required: true,
      is_multiple: false,
      display_order: 0,
    });
    const optSId = await createCategoryOption(sizeGroupId, {
      name: 'Moyenne',
      price_modifier: 0,
      is_default: true,
      display_order: 0,
    });
    await createCategoryOption(sizeGroupId, {
      name: 'Grande',
      price_modifier: 300,
      is_default: false,
      display_order: 1,
    });

    // Item with price override: Moyenne=1000 (absolute), Grande uses default
    const itemId = await createMenuItem(foodtruckId, catId, {
      name: 'Margherita',
      price: 900, // base price in cents
      option_prices: { [optSId]: 1000 }, // override Moyenne to 10€
    });

    await runMigrationAndFix(foodtruckId);

    // Check group
    const { data: groups } = await supabaseAdmin
      .from('menu_item_option_groups')
      .select('id, price_mode')
      .eq('menu_item_id', itemId);

    expect(groups).toHaveLength(1);
    expect(groups![0].price_mode).toBe('absolute');

    // Check options
    const { data: options } = await supabaseAdmin
      .from('menu_item_options')
      .select('name, price_modifier')
      .eq('group_id', groups![0].id)
      .order('display_order');

    expect(options).toHaveLength(2);
    // Moyenne: override = 1000 (absolute)
    expect(options![0].name).toBe('Moyenne');
    expect(options![0].price_modifier).toBe(1000);
    // Grande: no override → base(900) + delta(300) = 1200 (absolute)
    expect(options![1].name).toBe('Grande');
    expect(options![1].price_modifier).toBe(1200);

    // Cleanup
    await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', itemId);
    await supabaseAdmin.from('menu_items').delete().eq('id', itemId);
    await supabaseAdmin.from('category_option_groups').delete().eq('category_id', catId);
    await supabaseAdmin.from('categories').delete().eq('id', catId);
  });

  it('2. size group without override → price_mode=absolute, price = base + delta', async () => {
    const catId = await createCategory(foodtruckId, 'Burgers');
    const sizeGroupId = await createCategoryOptionGroup(catId, {
      name: 'Taille',
      is_required: true,
      is_multiple: false,
      display_order: 0,
    });
    await createCategoryOption(sizeGroupId, {
      name: 'Simple',
      price_modifier: 0,
      is_default: true,
      display_order: 0,
    });
    await createCategoryOption(sizeGroupId, {
      name: 'Double',
      price_modifier: 400,
      is_default: false,
      display_order: 1,
    });

    // Item WITHOUT overrides
    const itemId = await createMenuItem(foodtruckId, catId, {
      name: 'Classic Burger',
      price: 800,
    });

    await runMigrationAndFix(foodtruckId);

    const { data: groups } = await supabaseAdmin
      .from('menu_item_option_groups')
      .select('id, price_mode')
      .eq('menu_item_id', itemId);

    expect(groups![0].price_mode).toBe('absolute');

    const { data: options } = await supabaseAdmin
      .from('menu_item_options')
      .select('name, price_modifier')
      .eq('group_id', groups![0].id)
      .order('display_order');

    // Simple: 800 + 0 = 800
    expect(options![0].name).toBe('Simple');
    expect(options![0].price_modifier).toBe(800);
    // Double: 800 + 400 = 1200
    expect(options![1].name).toBe('Double');
    expect(options![1].price_modifier).toBe(1200);

    // Cleanup
    await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', itemId);
    await supabaseAdmin.from('menu_items').delete().eq('id', itemId);
    await supabaseAdmin.from('category_option_groups').delete().eq('category_id', catId);
    await supabaseAdmin.from('categories').delete().eq('id', catId);
  });

  it('3. supplement group → price_mode=modifier, prices unchanged', async () => {
    const catId = await createCategory(foodtruckId, 'Salades');
    // Add a required group first (to test that supplements aren't confused)
    const sizeGroupId = await createCategoryOptionGroup(catId, {
      name: 'Taille',
      is_required: true,
      is_multiple: false,
      display_order: 0,
    });
    await createCategoryOption(sizeGroupId, {
      name: 'Normale',
      price_modifier: 0,
      is_default: true,
      display_order: 0,
    });

    const suppGroupId = await createCategoryOptionGroup(catId, {
      name: 'Supplements',
      is_required: false,
      is_multiple: true,
      display_order: 1,
    });
    await createCategoryOption(suppGroupId, {
      name: 'Fromage',
      price_modifier: 150,
      display_order: 0,
    });
    await createCategoryOption(suppGroupId, {
      name: 'Avocat',
      price_modifier: 200,
      display_order: 1,
    });

    const itemId = await createMenuItem(foodtruckId, catId, {
      name: 'Caesar Salad',
      price: 1100,
    });

    await runMigrationAndFix(foodtruckId);

    // Check supplement group
    const { data: groups } = await supabaseAdmin
      .from('menu_item_option_groups')
      .select('id, name, price_mode')
      .eq('menu_item_id', itemId)
      .order('display_order');

    expect(groups).toHaveLength(2);
    expect(groups![0].name).toBe('Taille');
    expect(groups![0].price_mode).toBe('absolute');
    expect(groups![1].name).toBe('Supplements');
    expect(groups![1].price_mode).toBe('modifier');

    // Check supplement options: modifiers unchanged
    const { data: suppOptions } = await supabaseAdmin
      .from('menu_item_options')
      .select('name, price_modifier')
      .eq('group_id', groups![1].id)
      .order('display_order');

    expect(suppOptions![0].name).toBe('Fromage');
    expect(suppOptions![0].price_modifier).toBe(150);
    expect(suppOptions![1].name).toBe('Avocat');
    expect(suppOptions![1].price_modifier).toBe(200);

    // Cleanup
    await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', itemId);
    await supabaseAdmin.from('menu_items').delete().eq('id', itemId);
    await supabaseAdmin.from('category_option_groups').delete().eq('category_id', catId);
    await supabaseAdmin.from('categories').delete().eq('id', catId);
  });

  it('4. two required groups (Taille + Cuisson): only first is absolute', async () => {
    const catId = await createCategory(foodtruckId, 'Steaks');

    // Group 1: Taille (display_order=0) → should be absolute
    const tailleGroupId = await createCategoryOptionGroup(catId, {
      name: 'Taille',
      is_required: true,
      is_multiple: false,
      display_order: 0,
    });
    await createCategoryOption(tailleGroupId, {
      name: 'Petit',
      price_modifier: 0,
      is_default: true,
      display_order: 0,
    });
    await createCategoryOption(tailleGroupId, {
      name: 'Grand',
      price_modifier: 500,
      is_default: false,
      display_order: 1,
    });

    // Group 2: Cuisson (display_order=1) → should be modifier
    const cuissonGroupId = await createCategoryOptionGroup(catId, {
      name: 'Cuisson',
      is_required: true,
      is_multiple: false,
      display_order: 1,
    });
    await createCategoryOption(cuissonGroupId, {
      name: 'Saignant',
      price_modifier: 0,
      is_default: true,
      display_order: 0,
    });
    await createCategoryOption(cuissonGroupId, {
      name: 'Bien cuit',
      price_modifier: 0,
      is_default: false,
      display_order: 1,
    });

    const itemId = await createMenuItem(foodtruckId, catId, {
      name: 'Entrecote',
      price: 2500,
    });

    await runMigrationAndFix(foodtruckId);

    const { data: groups } = await supabaseAdmin
      .from('menu_item_option_groups')
      .select('id, name, price_mode')
      .eq('menu_item_id', itemId)
      .order('display_order');

    expect(groups).toHaveLength(2);

    // Taille → absolute
    expect(groups![0].name).toBe('Taille');
    expect(groups![0].price_mode).toBe('absolute');

    // Cuisson → modifier (even though required)
    expect(groups![1].name).toBe('Cuisson');
    expect(groups![1].price_mode).toBe('modifier');

    // Taille options: absolute prices
    const { data: tailleOpts } = await supabaseAdmin
      .from('menu_item_options')
      .select('name, price_modifier')
      .eq('group_id', groups![0].id)
      .order('display_order');

    expect(tailleOpts![0].name).toBe('Petit');
    expect(tailleOpts![0].price_modifier).toBe(2500); // 2500 + 0
    expect(tailleOpts![1].name).toBe('Grand');
    expect(tailleOpts![1].price_modifier).toBe(3000); // 2500 + 500

    // Cuisson options: modifiers (deltas)
    const { data: cuissonOpts } = await supabaseAdmin
      .from('menu_item_options')
      .select('name, price_modifier')
      .eq('group_id', groups![1].id)
      .order('display_order');

    expect(cuissonOpts![0].name).toBe('Saignant');
    expect(cuissonOpts![0].price_modifier).toBe(0);
    expect(cuissonOpts![1].name).toBe('Bien cuit');
    expect(cuissonOpts![1].price_modifier).toBe(0);

    // Cleanup
    await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', itemId);
    await supabaseAdmin.from('menu_items').delete().eq('id', itemId);
    await supabaseAdmin.from('category_option_groups').delete().eq('category_id', catId);
    await supabaseAdmin.from('categories').delete().eq('id', catId);
  });

  it('5. price equivalence: old model total = new model total', async () => {
    const catId = await createCategory(foodtruckId, 'Wraps');

    // Size group with 3 sizes
    const sizeGroupId = await createCategoryOptionGroup(catId, {
      name: 'Taille',
      is_required: true,
      is_multiple: false,
      display_order: 0,
    });
    await createCategoryOption(sizeGroupId, {
      name: 'S',
      price_modifier: 0,
      is_default: true,
      display_order: 0,
    });
    const optM = await createCategoryOption(sizeGroupId, {
      name: 'M',
      price_modifier: 200,
      display_order: 1,
    });
    await createCategoryOption(sizeGroupId, {
      name: 'L',
      price_modifier: 400,
      display_order: 2,
    });

    // Supplement group
    const suppGroupId = await createCategoryOptionGroup(catId, {
      name: 'Extras',
      is_required: false,
      is_multiple: true,
      display_order: 1,
    });
    await createCategoryOption(suppGroupId, {
      name: 'Guacamole',
      price_modifier: 150,
      display_order: 0,
    });

    // Item with M override
    const basePrice = 700;
    const itemId = await createMenuItem(foodtruckId, catId, {
      name: 'Chicken Wrap',
      price: basePrice,
      option_prices: { [optM]: 1000 }, // M overridden to 10€
    });

    await runMigrationAndFix(foodtruckId);

    // Fetch new model data
    const { data: groups } = await supabaseAdmin
      .from('menu_item_option_groups')
      .select('id, name, price_mode')
      .eq('menu_item_id', itemId)
      .order('display_order');

    const { data: sizeOpts } = await supabaseAdmin
      .from('menu_item_options')
      .select('name, price_modifier')
      .eq('group_id', groups![0].id)
      .order('display_order');

    const { data: suppOpts } = await supabaseAdmin
      .from('menu_item_options')
      .select('name, price_modifier')
      .eq('group_id', groups![1].id)
      .order('display_order');

    // OLD MODEL calculations:
    // S: no override → basePrice + 0 = 700
    // M: override → 1000
    // L: no override → basePrice + 400 = 1100
    // Guacamole: modifier 150

    // NEW MODEL: price_mode=absolute for sizes
    expect(sizeOpts![0].price_modifier).toBe(700); // S: 700+0
    expect(sizeOpts![1].price_modifier).toBe(1000); // M: override
    expect(sizeOpts![2].price_modifier).toBe(1100); // L: 700+400

    // Test full price calculation: M + Guacamole
    // OLD: sizePrice(M)=1000, guac=150 → total = 1150
    // NEW: absolute(M)=1000, modifier(guac)=150 → total = 1000 + 150 = 1150
    const newTotal = sizeOpts![1].price_modifier + suppOpts![0].price_modifier;
    const oldTotal = 1000 + 150; // M override + guac modifier
    expect(newTotal).toBe(oldTotal);

    // Test: S + no extras
    // OLD: basePrice + 0 = 700
    // NEW: absolute(S) = 700
    expect(sizeOpts![0].price_modifier).toBe(basePrice + 0);

    // Test: L + Guacamole
    // OLD: basePrice + 400 + 150 = 1250
    // NEW: absolute(L) + modifier(guac) = 1100 + 150 = 1250
    expect(sizeOpts![2].price_modifier + suppOpts![0].price_modifier).toBe(basePrice + 400 + 150);

    // Cleanup
    await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', itemId);
    await supabaseAdmin.from('menu_items').delete().eq('id', itemId);
    await supabaseAdmin.from('category_option_groups').delete().eq('category_id', catId);
    await supabaseAdmin.from('categories').delete().eq('id', catId);
  });
});
