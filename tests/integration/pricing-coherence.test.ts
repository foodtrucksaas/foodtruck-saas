/**
 * Pricing Coherence Integration Test
 *
 * Validates that the client-side pricing logic (packages/shared/src/utils/pricing.ts)
 * and the server-side pricing logic (supabase/functions/_shared/orders.ts)
 * produce identical results.
 *
 * If this test breaks, it means the two implementations have drifted.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabaseAdmin, createTestUser, deleteTestUser, callEdgeFunction } from './setup';
import {
  computeMenuItemPrice,
  computeCartItemUnitPrice,
  type PricingOptionGroup,
} from '../../packages/shared/src/utils/pricing';
import type { SelectedOption } from '../../packages/shared/src/types';

// ============================================
// Test data IDs (populated in beforeAll)
// ============================================
let ownerUser: { user: { id: string; email: string }; session: { access_token: string } };
let foodtruckId: string;
let categoryId: string;
let menuItemId: string;

// Option groups & options
let absoluteGroupId: string;
let optionS: { id: string; price_modifier: number };
let optionM: { id: string; price_modifier: number };
let optionL: { id: string; price_modifier: number };

let modifierGroupCuisson: string;
let optionSaignant: { id: string; price_modifier: number };
let optionAPoint: { id: string; price_modifier: number };
let optionBienCuit: { id: string; price_modifier: number };

let modifierGroupSupplements: string;
let optionFromage: { id: string; price_modifier: number };
let optionAvocat: { id: string; price_modifier: number };

const MENU_ITEM_BASE_PRICE = 800; // = cheapest absolute option (S)
const createdOrderIds: string[] = [];

describe('Pricing coherence: shared vs create-order', () => {
  beforeAll(async () => {
    ownerUser = await createTestUser();
    const ts = Date.now();

    // Create foodtruck
    const { data: ft, error: ftErr } = await supabaseAdmin
      .from('foodtrucks')
      .insert({
        user_id: ownerUser.user.id,
        name: `Pricing Test Truck ${ts}`,
        slug: `pricing-test-${ts}`,
        email: `pricing-test-${ts}@test.com`,
        auto_accept_orders: true,
      })
      .select('id')
      .single();
    if (ftErr || !ft) throw new Error(`Failed to create foodtruck: ${ftErr?.message}`);
    foodtruckId = ft.id;

    // Create subscription (required: create-order checks subscription status)
    await supabaseAdmin.from('subscriptions').insert({
      foodtruck_id: foodtruckId,
      status: 'trialing',
      plan: 'basic',
      trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    });

    // Create category
    const { data: cat } = await supabaseAdmin
      .from('categories')
      .insert({ foodtruck_id: foodtruckId, name: 'Burgers', display_order: 0 })
      .select('id')
      .single();
    categoryId = cat!.id;

    // Create menu item (price = cheapest absolute = S = 800)
    const { data: mi } = await supabaseAdmin
      .from('menu_items')
      .insert({
        foodtruck_id: foodtruckId,
        category_id: categoryId,
        name: 'Classic Burger',
        price: MENU_ITEM_BASE_PRICE,
        is_available: true,
        display_order: 0,
      })
      .select('id')
      .single();
    menuItemId = mi!.id;

    // --- Option group 1: Taille (absolute) ---
    const { data: og1 } = await supabaseAdmin
      .from('menu_item_option_groups')
      .insert({
        menu_item_id: menuItemId,
        name: 'Taille',
        price_mode: 'absolute',
        is_required: true,
        is_multiple: false,
        display_order: 0,
      })
      .select('id')
      .single();
    absoluteGroupId = og1!.id;

    const sizeOptions = [
      {
        group_id: absoluteGroupId,
        name: 'S',
        price_modifier: 800,
        is_available: true,
        display_order: 0,
      },
      {
        group_id: absoluteGroupId,
        name: 'M',
        price_modifier: 1000,
        is_available: true,
        display_order: 1,
      },
      {
        group_id: absoluteGroupId,
        name: 'L',
        price_modifier: 1300,
        is_available: true,
        display_order: 2,
      },
    ];
    const { data: sizeOpts, error: sizeErr } = await supabaseAdmin
      .from('menu_item_options')
      .insert(sizeOptions)
      .select('id, name, price_modifier');
    if (sizeErr || !sizeOpts) throw new Error(`Failed to create size options: ${sizeErr?.message}`);
    optionS = sizeOpts.find((o) => o.name === 'S')!;
    optionM = sizeOpts.find((o) => o.name === 'M')!;
    optionL = sizeOpts.find((o) => o.name === 'L')!;

    // --- Option group 2: Cuisson (modifier, required, single) ---
    const { data: og2 } = await supabaseAdmin
      .from('menu_item_option_groups')
      .insert({
        menu_item_id: menuItemId,
        name: 'Cuisson',
        price_mode: 'modifier',
        is_required: true,
        is_multiple: false,
        display_order: 1,
      })
      .select('id')
      .single();
    modifierGroupCuisson = og2!.id;

    const cuissonOptions = [
      {
        group_id: modifierGroupCuisson,
        name: 'Saignant',
        price_modifier: 0,
        is_available: true,
        display_order: 0,
      },
      {
        group_id: modifierGroupCuisson,
        name: 'A point',
        price_modifier: 0,
        is_available: true,
        display_order: 1,
      },
      {
        group_id: modifierGroupCuisson,
        name: 'Bien cuit',
        price_modifier: 0,
        is_available: true,
        display_order: 2,
      },
    ];
    const { data: cuissonOpts, error: cuissonErr } = await supabaseAdmin
      .from('menu_item_options')
      .insert(cuissonOptions)
      .select('id, name, price_modifier');
    if (cuissonErr || !cuissonOpts)
      throw new Error(`Failed to create cuisson options: ${cuissonErr?.message}`);
    optionSaignant = cuissonOpts.find((o) => o.name === 'Saignant')!;
    optionAPoint = cuissonOpts.find((o) => o.name === 'A point')!;
    optionBienCuit = cuissonOpts.find((o) => o.name === 'Bien cuit')!;

    // --- Option group 3: Supplements (modifier, optional, multiple) ---
    const { data: og3 } = await supabaseAdmin
      .from('menu_item_option_groups')
      .insert({
        menu_item_id: menuItemId,
        name: 'Supplements',
        price_mode: 'modifier',
        is_required: false,
        is_multiple: true,
        display_order: 2,
      })
      .select('id')
      .single();
    modifierGroupSupplements = og3!.id;

    const supplementOptions = [
      {
        group_id: modifierGroupSupplements,
        name: 'Fromage',
        price_modifier: 200,
        is_available: true,
        display_order: 0,
      },
      {
        group_id: modifierGroupSupplements,
        name: 'Avocat',
        price_modifier: 300,
        is_available: true,
        display_order: 1,
      },
    ];
    const { data: suppOpts, error: suppErr } = await supabaseAdmin
      .from('menu_item_options')
      .insert(supplementOptions)
      .select('id, name, price_modifier');
    if (suppErr || !suppOpts)
      throw new Error(`Failed to create supplement options: ${suppErr?.message}`);
    optionFromage = suppOpts.find((o) => o.name === 'Fromage')!;
    optionAvocat = suppOpts.find((o) => o.name === 'Avocat')!;
  });

  afterAll(async () => {
    // Cleanup created orders
    for (const orderId of createdOrderIds) {
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('id')
        .eq('order_id', orderId);
      if (orderItems) {
        for (const oi of orderItems) {
          await supabaseAdmin.from('order_item_options').delete().eq('order_item_id', oi.id);
        }
      }
      await supabaseAdmin.from('order_items').delete().eq('order_id', orderId);
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
    }

    // Cleanup test data (reverse dependency order)
    await supabaseAdmin.from('menu_item_options').delete().eq('option_group_id', absoluteGroupId);
    await supabaseAdmin
      .from('menu_item_options')
      .delete()
      .eq('option_group_id', modifierGroupCuisson);
    await supabaseAdmin
      .from('menu_item_options')
      .delete()
      .eq('option_group_id', modifierGroupSupplements);
    await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', menuItemId);
    await supabaseAdmin.from('menu_items').delete().eq('foodtruck_id', foodtruckId);
    await supabaseAdmin.from('categories').delete().eq('foodtruck_id', foodtruckId);
    await supabaseAdmin.from('subscriptions').delete().eq('foodtruck_id', foodtruckId);
    await supabaseAdmin.from('foodtrucks').delete().eq('id', foodtruckId);
    if (ownerUser?.user?.id) await deleteTestUser(ownerUser.user.id);
  });

  // ============================================
  // Build helpers
  // ============================================

  /** Build PricingOptionGroup[] for computeMenuItemPrice (client display-time) */
  function buildPricingGroups(): PricingOptionGroup[] {
    return [
      {
        id: absoluteGroupId,
        price_mode: 'absolute',
        display_order: 0,
        options: [
          { id: optionS.id, price_modifier: optionS.price_modifier, is_available: true },
          { id: optionM.id, price_modifier: optionM.price_modifier, is_available: true },
          { id: optionL.id, price_modifier: optionL.price_modifier, is_available: true },
        ],
      },
      {
        id: modifierGroupCuisson,
        price_mode: 'modifier',
        display_order: 1,
        options: [
          { id: optionSaignant.id, price_modifier: 0, is_available: true },
          { id: optionAPoint.id, price_modifier: 0, is_available: true },
          { id: optionBienCuit.id, price_modifier: 0, is_available: true },
        ],
      },
      {
        id: modifierGroupSupplements,
        price_mode: 'modifier',
        display_order: 2,
        options: [
          {
            id: optionFromage.id,
            price_modifier: optionFromage.price_modifier,
            is_available: true,
          },
          { id: optionAvocat.id, price_modifier: optionAvocat.price_modifier, is_available: true },
        ],
      },
    ];
  }

  /** Build SelectedOption[] for computeCartItemUnitPrice (cart-time) */
  function buildCartSelectedOptions(
    opts: Array<{ opt: typeof optionS; groupName: string; priceMode: 'absolute' | 'modifier' }>
  ): SelectedOption[] {
    return opts.map((o) => ({
      optionId: o.opt.id,
      optionGroupId: '',
      name: '',
      groupName: o.groupName,
      priceModifier: o.opt.price_modifier,
      priceMode: o.priceMode,
    }));
  }

  /** Build order request selected_options (server format) */
  function buildServerOptions(
    opts: Array<{
      opt: typeof optionS;
      groupId: string;
      groupName: string;
      priceMode: 'absolute' | 'modifier';
    }>
  ) {
    return opts.map((o) => ({
      option_id: o.opt.id,
      option_group_id: o.groupId,
      name: '',
      group_name: o.groupName,
      price_modifier: o.opt.price_modifier,
      price_mode: o.priceMode,
    }));
  }

  /** Call create-order and track the order for cleanup */
  async function placeOrder(
    expectedTotal: number,
    serverOptions: ReturnType<typeof buildServerOptions>
  ) {
    const result = await callEdgeFunction('create-order', ownerUser.session.access_token, {
      foodtruck_id: foodtruckId,
      customer_name: 'Pricing Test',
      customer_email: 'pricing-test@test.com',
      pickup_time: new Date(Date.now() + 3600000).toISOString(),
      expected_total: expectedTotal,
      items: [
        {
          menu_item_id: menuItemId,
          quantity: 1,
          selected_options: serverOptions,
        },
      ],
    });
    if (result.status === 200 && (result.data as any)?.order?.id) {
      createdOrderIds.push((result.data as any).order.id);
    }
    return result;
  }

  // ============================================
  // Test combos
  // ============================================

  interface PricingCombo {
    label: string;
    selectedIds: string[]; // for computeMenuItemPrice
    cartOptions: Parameters<typeof buildCartSelectedOptions>[0]; // for computeCartItemUnitPrice
    serverOptions: Parameters<typeof buildServerOptions>[0]; // for create-order
    expectedPrice: number;
  }

  function getCombos(): PricingCombo[] {
    return [
      {
        label: 'S + Saignant, no supplements',
        selectedIds: [optionS.id, optionSaignant.id],
        cartOptions: [
          { opt: optionS, groupName: 'Taille', priceMode: 'absolute' },
          { opt: optionSaignant, groupName: 'Cuisson', priceMode: 'modifier' },
        ],
        serverOptions: [
          { opt: optionS, groupId: absoluteGroupId, groupName: 'Taille', priceMode: 'absolute' },
          {
            opt: optionSaignant,
            groupId: modifierGroupCuisson,
            groupName: 'Cuisson',
            priceMode: 'modifier',
          },
        ],
        expectedPrice: 800,
      },
      {
        label: 'M + A point + Fromage',
        selectedIds: [optionM.id, optionAPoint.id, optionFromage.id],
        cartOptions: [
          { opt: optionM, groupName: 'Taille', priceMode: 'absolute' },
          { opt: optionAPoint, groupName: 'Cuisson', priceMode: 'modifier' },
          { opt: optionFromage, groupName: 'Supplements', priceMode: 'modifier' },
        ],
        serverOptions: [
          { opt: optionM, groupId: absoluteGroupId, groupName: 'Taille', priceMode: 'absolute' },
          {
            opt: optionAPoint,
            groupId: modifierGroupCuisson,
            groupName: 'Cuisson',
            priceMode: 'modifier',
          },
          {
            opt: optionFromage,
            groupId: modifierGroupSupplements,
            groupName: 'Supplements',
            priceMode: 'modifier',
          },
        ],
        expectedPrice: 1200,
      },
      {
        label: 'L + Bien cuit + Fromage + Avocat',
        selectedIds: [optionL.id, optionBienCuit.id, optionFromage.id, optionAvocat.id],
        cartOptions: [
          { opt: optionL, groupName: 'Taille', priceMode: 'absolute' },
          { opt: optionBienCuit, groupName: 'Cuisson', priceMode: 'modifier' },
          { opt: optionFromage, groupName: 'Supplements', priceMode: 'modifier' },
          { opt: optionAvocat, groupName: 'Supplements', priceMode: 'modifier' },
        ],
        serverOptions: [
          { opt: optionL, groupId: absoluteGroupId, groupName: 'Taille', priceMode: 'absolute' },
          {
            opt: optionBienCuit,
            groupId: modifierGroupCuisson,
            groupName: 'Cuisson',
            priceMode: 'modifier',
          },
          {
            opt: optionFromage,
            groupId: modifierGroupSupplements,
            groupName: 'Supplements',
            priceMode: 'modifier',
          },
          {
            opt: optionAvocat,
            groupId: modifierGroupSupplements,
            groupName: 'Supplements',
            priceMode: 'modifier',
          },
        ],
        expectedPrice: 1800,
      },
      {
        label: 'S + Saignant + Fromage + Avocat',
        selectedIds: [optionS.id, optionSaignant.id, optionFromage.id, optionAvocat.id],
        cartOptions: [
          { opt: optionS, groupName: 'Taille', priceMode: 'absolute' },
          { opt: optionSaignant, groupName: 'Cuisson', priceMode: 'modifier' },
          { opt: optionFromage, groupName: 'Supplements', priceMode: 'modifier' },
          { opt: optionAvocat, groupName: 'Supplements', priceMode: 'modifier' },
        ],
        serverOptions: [
          { opt: optionS, groupId: absoluteGroupId, groupName: 'Taille', priceMode: 'absolute' },
          {
            opt: optionSaignant,
            groupId: modifierGroupCuisson,
            groupName: 'Cuisson',
            priceMode: 'modifier',
          },
          {
            opt: optionFromage,
            groupId: modifierGroupSupplements,
            groupName: 'Supplements',
            priceMode: 'modifier',
          },
          {
            opt: optionAvocat,
            groupId: modifierGroupSupplements,
            groupName: 'Supplements',
            priceMode: 'modifier',
          },
        ],
        expectedPrice: 1300,
      },
      {
        label: 'M + A point, no supplements',
        selectedIds: [optionM.id, optionAPoint.id],
        cartOptions: [
          { opt: optionM, groupName: 'Taille', priceMode: 'absolute' },
          { opt: optionAPoint, groupName: 'Cuisson', priceMode: 'modifier' },
        ],
        serverOptions: [
          { opt: optionM, groupId: absoluteGroupId, groupName: 'Taille', priceMode: 'absolute' },
          {
            opt: optionAPoint,
            groupId: modifierGroupCuisson,
            groupName: 'Cuisson',
            priceMode: 'modifier',
          },
        ],
        expectedPrice: 1000,
      },
      {
        label: 'L + Saignant + Avocat',
        selectedIds: [optionL.id, optionSaignant.id, optionAvocat.id],
        cartOptions: [
          { opt: optionL, groupName: 'Taille', priceMode: 'absolute' },
          { opt: optionSaignant, groupName: 'Cuisson', priceMode: 'modifier' },
          { opt: optionAvocat, groupName: 'Supplements', priceMode: 'modifier' },
        ],
        serverOptions: [
          { opt: optionL, groupId: absoluteGroupId, groupName: 'Taille', priceMode: 'absolute' },
          {
            opt: optionSaignant,
            groupId: modifierGroupCuisson,
            groupName: 'Cuisson',
            priceMode: 'modifier',
          },
          {
            opt: optionAvocat,
            groupId: modifierGroupSupplements,
            groupName: 'Supplements',
            priceMode: 'modifier',
          },
        ],
        expectedPrice: 1600,
      },
      {
        label: 'No absolute selected (fallback to base price) + Saignant',
        selectedIds: [optionSaignant.id],
        cartOptions: [{ opt: optionSaignant, groupName: 'Cuisson', priceMode: 'modifier' }],
        serverOptions: [
          {
            opt: optionSaignant,
            groupId: modifierGroupCuisson,
            groupName: 'Cuisson',
            priceMode: 'modifier',
          },
        ],
        expectedPrice: MENU_ITEM_BASE_PRICE, // 800 = menuItem.price (min absolute)
      },
    ];
  }

  // --- 1. Client-side coherence: computeMenuItemPrice === computeCartItemUnitPrice ---

  it('computeMenuItemPrice and computeCartItemUnitPrice agree on all combos', () => {
    const groups = buildPricingGroups();

    for (const combo of getCombos()) {
      const fromGroups = computeMenuItemPrice(MENU_ITEM_BASE_PRICE, groups, combo.selectedIds);
      const fromCart = computeCartItemUnitPrice(
        MENU_ITEM_BASE_PRICE,
        buildCartSelectedOptions(combo.cartOptions)
      );

      expect(fromGroups.unitPrice).toBe(
        combo.expectedPrice,
        `[${combo.label}] computeMenuItemPrice mismatch`
      );
      expect(fromCart).toBe(
        combo.expectedPrice,
        `[${combo.label}] computeCartItemUnitPrice mismatch`
      );
      expect(fromGroups.unitPrice).toBe(
        fromCart,
        `[${combo.label}] computeMenuItemPrice !== computeCartItemUnitPrice`
      );
    }
  });

  // --- 2. Server accepts client-computed prices ---

  it.each([
    ['S + Saignant, no supplements', 0],
    ['M + A point + Fromage', 1],
    ['L + Bien cuit + Fromage + Avocat', 2],
    ['S + Saignant + Fromage + Avocat', 3],
    ['M + A point, no supplements', 4],
    ['L + Saignant + Avocat', 5],
    ['No absolute selected (fallback to base price) + Saignant', 6],
  ])('create-order ACCEPTS correct price: %s', async (_label, idx) => {
    const combo = getCombos()[idx];
    const serverOpts = buildServerOptions(combo.serverOptions);
    const { status, error } = await placeOrder(combo.expectedPrice, serverOpts);

    expect(error).toBeNull();
    expect(status).toBe(200);
  });

  // --- 3. Server rejects wrong prices ---

  it.each([
    ['S + Saignant (price +2 centimes)', 0, 2],
    ['M + A point + Fromage (price -5 centimes)', 1, -5],
    ['L + Bien cuit + all supplements (price +100)', 2, 100],
    ['S + all supplements (price -200)', 3, -200],
    ['L + Saignant + Avocat (price +3 centimes)', 5, 3],
  ])('create-order REJECTS wrong price: %s', async (_label, idx, drift) => {
    const combo = getCombos()[idx as number];
    const wrongPrice = combo.expectedPrice + (drift as number);
    const serverOpts = buildServerOptions(combo.serverOptions);
    const { status } = await placeOrder(wrongPrice, serverOpts);

    // Server should reject with 400 (total mismatch) — tolerance is 1 centime
    expect(status).toBeGreaterThanOrEqual(400);
  });
});
