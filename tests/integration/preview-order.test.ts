/**
 * Integration Tests for preview-order Edge Function
 *
 * Ces tests vérifient que le calcul de preview fonctionne
 * correctement avec la VRAIE base de données.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  supabaseAdmin,
  createTestUser,
  deleteTestUser,
  createTestFoodtruck,
  cleanupTestFoodtruck,
  FUNCTIONS_URL,
} from './setup';

// Helper to call preview-order (public, no auth needed)
async function callPreview(
  body: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; status: number }> {
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${FUNCTIONS_URL}/preview-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  return { data: data as Record<string, unknown>, status: response.status };
}

describe('preview-order Edge Function', () => {
  let ownerUser: {
    user: { id: string; email: string };
    session: { access_token: string };
  };
  let testData: Awaited<ReturnType<typeof createTestFoodtruck>>;

  // Additional test fixtures
  let secondMenuItem: { id: string };
  let modifierOptionGroupId: string;
  let modifierOptionId: string;
  let sizeOptionGroupId: string;
  let sizeOptionSmallId: string;
  let sizeOptionLargeId: string;

  beforeAll(async () => {
    ownerUser = await createTestUser();
    testData = await createTestFoodtruck(ownerUser.user.id);

    // Create a second menu item
    const { data: mi2, error: mi2Error } = await supabaseAdmin
      .from('menu_items')
      .insert({
        foodtruck_id: testData.foodtruck.id,
        category_id: testData.category.id,
        name: 'Test Drink',
        price: 500,
        is_available: true,
        display_order: 1,
      })
      .select('id')
      .single();

    if (mi2Error || !mi2)
      throw new Error(`Failed to create second menu item: ${mi2Error?.message}`);
    secondMenuItem = mi2;

    // Create a modifier option group on the menu item (menu_item_option_groups)
    const { data: modOg, error: modOgError } = await supabaseAdmin
      .from('menu_item_option_groups')
      .insert({
        menu_item_id: testData.menuItem.id,
        name: 'Supplements',
        is_required: false,
        is_multiple: true,
        display_order: 1,
        price_mode: 'modifier',
      })
      .select('id')
      .single();

    if (modOgError || !modOg)
      throw new Error(`Failed to create modifier option group: ${modOgError?.message}`);
    modifierOptionGroupId = modOg.id;

    const { data: modOpt, error: modOptError } = await supabaseAdmin
      .from('menu_item_options')
      .insert({
        group_id: modOg.id,
        name: 'Extra Cheese',
        price_modifier: 200,
        display_order: 0,
      })
      .select('id')
      .single();

    if (modOptError || !modOpt)
      throw new Error(`Failed to create modifier option: ${modOptError?.message}`);
    modifierOptionId = modOpt.id;

    // Create a size option group (absolute pricing)
    const { data: sizeOg, error: sizeOgError } = await supabaseAdmin
      .from('menu_item_option_groups')
      .insert({
        menu_item_id: testData.menuItem.id,
        name: 'Size',
        is_required: true,
        is_multiple: false,
        display_order: 2,
        price_mode: 'absolute',
      })
      .select('id')
      .single();

    if (sizeOgError || !sizeOg)
      throw new Error(`Failed to create size option group: ${sizeOgError?.message}`);
    sizeOptionGroupId = sizeOg.id;

    const { data: smallOpt, error: smallError } = await supabaseAdmin
      .from('menu_item_options')
      .insert({
        group_id: sizeOg.id,
        name: 'Small',
        price_modifier: 800, // Absolute: 8 EUR
        display_order: 0,
      })
      .select('id')
      .single();

    if (smallError || !smallOpt)
      throw new Error(`Failed to create small option: ${smallError?.message}`);
    sizeOptionSmallId = smallOpt.id;

    const { data: largeOpt, error: largeError } = await supabaseAdmin
      .from('menu_item_options')
      .insert({
        group_id: sizeOg.id,
        name: 'Large',
        price_modifier: 1200, // Absolute: 12 EUR
        display_order: 1,
      })
      .select('id')
      .single();

    if (largeError || !largeOpt)
      throw new Error(`Failed to create large option: ${largeError?.message}`);
    sizeOptionLargeId = largeOpt.id;
  });

  afterAll(async () => {
    if (testData?.foodtruck?.id) {
      // Clean up menu_item_options and groups (cascade via ON DELETE CASCADE)
      await supabaseAdmin.from('menu_item_options').delete().eq('group_id', modifierOptionGroupId);
      await supabaseAdmin.from('menu_item_options').delete().eq('group_id', sizeOptionGroupId);
      await supabaseAdmin.from('menu_item_option_groups').delete().eq('id', modifierOptionGroupId);
      await supabaseAdmin.from('menu_item_option_groups').delete().eq('id', sizeOptionGroupId);

      // Clean up additional menu items
      await supabaseAdmin.from('menu_items').delete().eq('id', secondMenuItem.id);

      await cleanupTestFoodtruck(testData.foodtruck.id);
    }
    if (ownerUser?.user?.id) {
      await deleteTestUser(ownerUser.user.id);
    }
  });

  // ========================================
  // Basic cart scenarios
  // ========================================

  it('should return subtotal for a single item without options', async () => {
    const { data, status } = await callPreview({
      foodtruck_id: testData.foodtruck.id,
      items: [
        {
          menu_item_id: testData.menuItem.id,
          quantity: 2,
          selected_option_ids: [],
        },
      ],
    });

    expect(status).toBe(200);
    expect(data.subtotal).toBe(2000); // 1000 * 2
    expect(data.total).toBe(2000);
    expect(data.line_items).toHaveLength(1);
    expect(data.discounts).toEqual([]);
    expect(data.warnings).toEqual([]);
  });

  it('should handle empty cart', async () => {
    const { data, status } = await callPreview({
      foodtruck_id: testData.foodtruck.id,
      items: [],
    });

    expect(status).toBe(200);
    expect(data.subtotal).toBe(0);
    expect(data.total).toBe(0);
    expect(data.line_items).toEqual([]);
  });

  it('should handle multiple items', async () => {
    const { data, status } = await callPreview({
      foodtruck_id: testData.foodtruck.id,
      items: [
        { menu_item_id: testData.menuItem.id, quantity: 1, selected_option_ids: [] },
        { menu_item_id: secondMenuItem.id, quantity: 3, selected_option_ids: [] },
      ],
    });

    expect(status).toBe(200);
    expect(data.subtotal).toBe(2500); // 1000 + 500*3
    expect(data.total).toBe(2500);
    expect(data.line_items).toHaveLength(2);
  });

  // ========================================
  // Options scenarios
  // ========================================

  it('should apply modifier option (supplement)', async () => {
    const { data, status } = await callPreview({
      foodtruck_id: testData.foodtruck.id,
      items: [
        {
          menu_item_id: testData.menuItem.id,
          quantity: 1,
          selected_option_ids: [modifierOptionId],
        },
      ],
    });

    expect(status).toBe(200);
    // base_price=1000 + modifier=200 = 1200
    expect(data.subtotal).toBe(1200);
    expect(data.total).toBe(1200);
  });

  it('should apply absolute option (size)', async () => {
    const { data, status } = await callPreview({
      foodtruck_id: testData.foodtruck.id,
      items: [
        {
          menu_item_id: testData.menuItem.id,
          quantity: 1,
          selected_option_ids: [sizeOptionLargeId],
        },
      ],
    });

    expect(status).toBe(200);
    // absolute option replaces base price: 1200 (not 1000+1200)
    expect(data.subtotal).toBe(1200);
  });

  it('should apply absolute + modifier options together', async () => {
    const { data, status } = await callPreview({
      foodtruck_id: testData.foodtruck.id,
      items: [
        {
          menu_item_id: testData.menuItem.id,
          quantity: 2,
          selected_option_ids: [sizeOptionSmallId, modifierOptionId],
        },
      ],
    });

    expect(status).toBe(200);
    // absolute=800 + modifier=200 = 1000 per unit, * 2 = 2000
    expect(data.subtotal).toBe(2000);
  });

  // ========================================
  // Error scenarios
  // ========================================

  it('should return 404 for non-existent foodtruck', async () => {
    const { status } = await callPreview({
      foodtruck_id: '00000000-0000-0000-0000-000000000000',
      items: [],
    });

    expect(status).toBe(404);
  });

  it('should return 400 for invalid payload', async () => {
    const { status } = await callPreview({
      items: [{ menu_item_id: 'not-a-uuid', quantity: 1 }],
    });

    expect(status).toBe(400);
  });

  it('should return warning for non-existent menu item', async () => {
    const { data, status } = await callPreview({
      foodtruck_id: testData.foodtruck.id,
      items: [
        {
          menu_item_id: '00000000-0000-0000-0000-000000000099',
          quantity: 1,
          selected_option_ids: [],
        },
      ],
    });

    expect(status).toBe(200);
    expect(data.total).toBe(0);
    expect((data.warnings as string[]).length).toBeGreaterThan(0);
    expect((data.warnings as string[])[0]).toContain('not found');
  });

  // ========================================
  // Promo code scenarios
  // ========================================

  it('should return result without promo when code is invalid', async () => {
    const { data, status } = await callPreview({
      foodtruck_id: testData.foodtruck.id,
      items: [
        {
          menu_item_id: testData.menuItem.id,
          quantity: 1,
          selected_option_ids: [],
        },
      ],
      promo_code: 'FAKE_CODE_NONEXISTENT',
      customer: { email: 'test@test.com' },
    });

    expect(status).toBe(200);
    // Invalid promo → no discount, no error — promo engine silently returns empty
    expect(data.subtotal).toBe(1000);
    expect(data.total).toBe(1000);
  });
});
