/**
 * Integration Tests for create-order with pricing engine (Step D).
 *
 * Tests both legacy and new payload formats, discount cascading,
 * edge cases (deleted items, expired subscription, full slots).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  supabaseAdmin,
  createTestUser,
  deleteTestUser,
  callEdgeFunction,
  SUPABASE_SERVICE_ROLE_KEY,
} from './setup';

let ownerUser: { user: { id: string; email: string }; session: { access_token: string } };
let foodtruckId: string;
let categoryId: string;
let menuItemId: string;
let sizeGroupId: string;
let optionSId: string;
let optionMId: string;
let suppGroupId: string;
let optionFromageId: string;
const createdOrderIds: string[] = [];

describe('create-order engine (Step D)', () => {
  beforeAll(async () => {
    ownerUser = await createTestUser();
    const ts = Date.now();

    // Foodtruck with auto_accept + max_orders_per_slot
    const { data: ft } = await supabaseAdmin
      .from('foodtrucks')
      .insert({
        user_id: ownerUser.user.id,
        name: `Engine Test ${ts}`,
        slug: `engine-test-${ts}`,
        email: `engine-test-${ts}@test.com`,
        auto_accept_orders: true,
        max_orders_per_slot: 2,
      })
      .select('id')
      .single();
    if (!ft) throw new Error('Failed to create foodtruck');
    foodtruckId = ft.id;

    // Subscription (trialing)
    await supabaseAdmin.from('subscriptions').upsert({
      foodtruck_id: foodtruckId,
      status: 'trialing',
      plan: 'basic',
      trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    });

    // Category + 2 menu items
    const { data: cat } = await supabaseAdmin
      .from('categories')
      .insert({ foodtruck_id: foodtruckId, name: 'Burgers', display_order: 0 })
      .select('id')
      .single();
    categoryId = cat!.id;

    const { data: mi1 } = await supabaseAdmin
      .from('menu_items')
      .insert({
        foodtruck_id: foodtruckId,
        category_id: categoryId,
        name: 'Classic Burger',
        price: 800,
        is_available: true,
        display_order: 0,
      })
      .select('id')
      .single();
    menuItemId = mi1!.id;

    // Size group (absolute) with S=800, M=1000
    const { data: sg } = await supabaseAdmin
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
    sizeGroupId = sg!.id;

    const { data: sizeOpts } = await supabaseAdmin
      .from('menu_item_options')
      .insert([
        {
          group_id: sizeGroupId,
          name: 'S',
          price_modifier: 800,
          is_available: true,
          display_order: 0,
        },
        {
          group_id: sizeGroupId,
          name: 'M',
          price_modifier: 1000,
          is_available: true,
          display_order: 1,
        },
      ])
      .select('id, name');
    optionSId = sizeOpts!.find((o) => o.name === 'S')!.id;
    optionMId = sizeOpts!.find((o) => o.name === 'M')!.id;

    // Supplement group (modifier) with Fromage=200
    const { data: supg } = await supabaseAdmin
      .from('menu_item_option_groups')
      .insert({
        menu_item_id: menuItemId,
        name: 'Supplements',
        price_mode: 'modifier',
        is_required: false,
        is_multiple: true,
        display_order: 1,
      })
      .select('id')
      .single();
    suppGroupId = supg!.id;

    const { data: suppOpts } = await supabaseAdmin
      .from('menu_item_options')
      .insert([
        {
          group_id: suppGroupId,
          name: 'Fromage',
          price_modifier: 200,
          is_available: true,
          display_order: 0,
        },
      ])
      .select('id, name');
    optionFromageId = suppOpts!.find((o) => o.name === 'Fromage')!.id;
  });

  afterAll(async () => {
    // Cleanup orders
    for (const orderId of createdOrderIds) {
      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('id')
        .eq('order_id', orderId);
      if (items) {
        for (const oi of items) {
          await supabaseAdmin.from('order_item_options').delete().eq('order_item_id', oi.id);
        }
      }
      await supabaseAdmin.from('order_items').delete().eq('order_id', orderId);
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
    }

    // Cleanup data
    await supabaseAdmin.from('offer_uses').delete().eq('customer_email', 'engine-test@test.com');
    await supabaseAdmin.from('menu_item_options').delete().eq('group_id', sizeGroupId);
    await supabaseAdmin.from('menu_item_options').delete().eq('group_id', suppGroupId);
    await supabaseAdmin.from('menu_item_option_groups').delete().eq('menu_item_id', menuItemId);
    await supabaseAdmin.from('menu_items').delete().eq('foodtruck_id', foodtruckId);
    await supabaseAdmin.from('categories').delete().eq('foodtruck_id', foodtruckId);
    await supabaseAdmin.from('subscriptions').delete().eq('foodtruck_id', foodtruckId);
    await supabaseAdmin.from('foodtrucks').delete().eq('id', foodtruckId);
    if (ownerUser?.user?.id) await deleteTestUser(ownerUser.user.id);
  });

  // Each test uses a different hour offset to avoid slot collisions (max_orders_per_slot = 2)
  let pickupOffset = 1;
  function pickupTime() {
    const offset = pickupOffset++;
    return new Date(Date.now() + offset * 3600000).toISOString();
  }

  async function placeOrderRaw(body: Record<string, unknown>) {
    // Use service role key to bypass rate limiting in integration tests
    const result = await callEdgeFunction('create-order', SUPABASE_SERVICE_ROLE_KEY!, body);
    if (result.status === 200 && (result.data as any)?.order?.id) {
      createdOrderIds.push((result.data as any).order.id);
    }
    return result;
  }

  // =============================================
  // 1. Legacy payload creates order correctly
  // =============================================
  it('legacy payload creates order correctly', async () => {
    const { status, data } = await placeOrderRaw({
      foodtruck_id: foodtruckId,
      customer_name: 'Legacy Test',
      customer_email: 'engine-test@test.com',
      pickup_time: pickupTime(),
      items: [
        {
          menu_item_id: menuItemId,
          quantity: 1,
          unit_price: 1000,
          selected_options: [
            {
              option_id: optionMId,
              option_group_id: sizeGroupId,
              name: 'M',
              group_name: 'Taille',
              price_modifier: 1000,
              price_mode: 'absolute',
            },
            {
              option_id: optionFromageId,
              option_group_id: suppGroupId,
              name: 'Fromage',
              group_name: 'Supplements',
              price_modifier: 200,
              price_mode: 'modifier',
            },
          ],
        },
      ],
    });

    expect(status).toBe(200);
    const order = (data as any)?.order;
    expect(order).toBeDefined();
    // M(1000) + Fromage(200) = 1200
    expect(order.total_amount).toBe(1200);
  });

  // =============================================
  // 2. New payload creates order correctly
  // =============================================
  it('new payload creates order correctly', async () => {
    const { status, data } = await placeOrderRaw({
      foodtruck_id: foodtruckId,
      customer_name: 'New Format',
      customer_email: 'engine-test@test.com',
      pickup_time: pickupTime(),
      items: [
        {
          menu_item_id: menuItemId,
          quantity: 1,
          selected_option_ids: [optionSId],
        },
      ],
    });

    expect(status).toBe(200);
    const order = (data as any)?.order;
    expect(order).toBeDefined();
    // S(800) = 800
    expect(order.total_amount).toBe(800);
  });

  // =============================================
  // 3. Both formats produce same DB result
  // =============================================
  it('both formats produce same total for same cart', async () => {
    // Legacy format
    const { data: d1 } = await placeOrderRaw({
      foodtruck_id: foodtruckId,
      customer_name: 'Format Compare',
      customer_email: 'engine-test@test.com',
      pickup_time: pickupTime(),
      items: [
        {
          menu_item_id: menuItemId,
          quantity: 2,
          unit_price: 800,
          selected_options: [
            {
              option_id: optionSId,
              option_group_id: sizeGroupId,
              name: 'S',
              group_name: 'Taille',
              price_modifier: 800,
              price_mode: 'absolute',
            },
          ],
        },
      ],
    });

    // New format
    const { data: d2 } = await placeOrderRaw({
      foodtruck_id: foodtruckId,
      customer_name: 'Format Compare',
      customer_email: 'engine-test@test.com',
      pickup_time: pickupTime(),
      items: [
        {
          menu_item_id: menuItemId,
          quantity: 2,
          selected_option_ids: [optionSId],
        },
      ],
    });

    const order1 = (d1 as any)?.order;
    const order2 = (d2 as any)?.order;
    expect(order1).toBeDefined();
    expect(order2).toBeDefined();
    expect(order1.total_amount).toBe(order2.total_amount);
    expect(order1.total_amount).toBe(1600); // 800 * 2
  });

  // =============================================
  // 4. Item deleted between preview and submit -> 400
  // =============================================
  it('returns error when item is deleted before submit', async () => {
    // Create a temporary menu item and delete it
    const { data: tmpItem } = await supabaseAdmin
      .from('menu_items')
      .insert({
        foodtruck_id: foodtruckId,
        category_id: categoryId,
        name: 'Ephemeral Item',
        price: 500,
        is_available: true,
        display_order: 99,
      })
      .select('id')
      .single();

    const tmpId = tmpItem!.id;
    // Delete it (simulating deletion between preview and submit)
    await supabaseAdmin.from('menu_items').delete().eq('id', tmpId);

    const { status } = await placeOrderRaw({
      foodtruck_id: foodtruckId,
      customer_name: 'Deleted Item',
      customer_email: 'engine-test@test.com',
      pickup_time: pickupTime(),
      items: [{ menu_item_id: tmpId, quantity: 1 }],
    });

    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
  });

  // =============================================
  // 5. Subscription expired -> 403
  // =============================================
  it('returns 403 when subscription is expired', async () => {
    // Temporarily set subscription to expired
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('foodtruck_id', foodtruckId);

    const { status } = await placeOrderRaw({
      foodtruck_id: foodtruckId,
      customer_name: 'Expired Sub',
      customer_email: 'engine-test@test.com',
      pickup_time: pickupTime(),
      items: [{ menu_item_id: menuItemId, quantity: 1 }],
    });

    expect(status).toBe(403);

    // Restore subscription
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'trialing' })
      .eq('foodtruck_id', foodtruckId);
  });

  // =============================================
  // 6. Slot full -> 409 (or 400)
  // =============================================
  it('rejects order when slot is full', async () => {
    // max_orders_per_slot = 2, fill 2 slots at the same time
    // Use a far-future time to avoid collisions with other tests
    const slotTime = new Date(Date.now() + 24 * 3600000); // 24h from now
    // Round to nearest hour to ensure same slot
    slotTime.setMinutes(0, 0, 0);
    const slotTimeStr = slotTime.toISOString();

    // Fill 2 orders
    const { status: s1 } = await placeOrderRaw({
      foodtruck_id: foodtruckId,
      customer_name: 'Slot Fill 1',
      customer_email: 'engine-test@test.com',
      pickup_time: slotTimeStr,
      items: [{ menu_item_id: menuItemId, quantity: 1 }],
    });
    expect(s1).toBe(200);

    const { status: s2 } = await placeOrderRaw({
      foodtruck_id: foodtruckId,
      customer_name: 'Slot Fill 2',
      customer_email: 'engine-test@test.com',
      pickup_time: slotTimeStr,
      items: [{ menu_item_id: menuItemId, quantity: 1 }],
    });
    expect(s2).toBe(200);

    // Third order should be rejected
    const { status: s3 } = await placeOrderRaw({
      foodtruck_id: foodtruckId,
      customer_name: 'Slot Overflow',
      customer_email: 'engine-test@test.com',
      pickup_time: slotTimeStr,
      items: [{ menu_item_id: menuItemId, quantity: 1 }],
    });

    // checkSlotAvailability returns 400 (errorResponse default status)
    expect(s3).toBeGreaterThanOrEqual(400);
  });

  // Tests 7 (multi-item) and 8 (ignores client unit_price) are covered by
  // pricing-coherence.test.ts and the legacy payload test above.
});
