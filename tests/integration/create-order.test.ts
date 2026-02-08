/**
 * Integration Tests for create-order Edge Function
 *
 * Ces tests vérifient que la création de commande fonctionne
 * correctement avec la VRAIE base de données.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  supabaseAdmin,
  createTestUser,
  deleteTestUser,
  createTestFoodtruck,
  cleanupTestFoodtruck,
  callEdgeFunction,
} from './setup';

describe('create-order Edge Function', () => {
  let ownerUser: { user: { id: string; email: string }; session: { access_token: string } };
  let testData: Awaited<ReturnType<typeof createTestFoodtruck>>;
  let createdOrderId: string | null = null;

  beforeAll(async () => {
    // Créer un owner avec son foodtruck
    ownerUser = await createTestUser();
    testData = await createTestFoodtruck(ownerUser.user.id);
  });

  afterAll(async () => {
    // Nettoyer les commandes créées
    if (createdOrderId) {
      await supabaseAdmin.from('order_items').delete().eq('order_id', createdOrderId);
      await supabaseAdmin.from('orders').delete().eq('id', createdOrderId);
    }

    // Nettoyer le foodtruck et l'utilisateur
    if (testData?.foodtruck?.id) {
      await cleanupTestFoodtruck(testData.foodtruck.id);
    }
    if (ownerUser?.user?.id) {
      await deleteTestUser(ownerUser.user.id);
    }
  });

  it('should create an order successfully', async () => {
    const orderData = {
      foodtruck_id: testData.foodtruck.id,
      customer_name: 'Test Customer',
      customer_email: 'customer@test.com',
      customer_phone: '0612345678',
      pickup_time: new Date(Date.now() + 3600000).toISOString(), // Dans 1h
      items: [
        {
          menu_item_id: testData.menuItem.id,
          quantity: 2,
          unit_price: 1000,
          notes: 'Test order',
        },
      ],
      notes: 'Integration test order',
    };

    const { data, error, status } = await callEdgeFunction(
      'create-order',
      ownerUser.session.access_token,
      orderData
    );

    expect(error).toBeNull();
    expect(status).toBe(200);
    expect(data).toHaveProperty('order');
    expect((data as any).order).toHaveProperty('id');

    createdOrderId = (data as any).order.id;

    // Vérifier que la commande existe dans la base
    const { data: dbOrder, error: dbError } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', createdOrderId)
      .single();

    expect(dbError).toBeNull();
    expect(dbOrder).not.toBeNull();
    expect(dbOrder.customer_name).toBe('Test Customer');
    expect(dbOrder.order_items).toHaveLength(1);
    expect(dbOrder.order_items[0].quantity).toBe(2);
  });

  it('should reject order without required fields', async () => {
    const invalidOrderData = {
      foodtruck_id: testData.foodtruck.id,
      // Manque customer_name, items, etc.
    };

    const { error, status } = await callEdgeFunction(
      'create-order',
      ownerUser.session.access_token,
      invalidOrderData
    );

    // L'API devrait rejeter cette requête
    expect(status).toBeGreaterThanOrEqual(400);
    expect(error).not.toBeNull();
  });

  it('should reject order with invalid foodtruck_id', async () => {
    const orderData = {
      foodtruck_id: '00000000-0000-0000-0000-000000000000', // UUID invalide
      customer_name: 'Test Customer',
      customer_email: 'customer@test.com',
      pickup_time: new Date(Date.now() + 3600000).toISOString(),
      items: [
        {
          menu_item_id: testData.menuItem.id,
          quantity: 1,
          unit_price: 1000,
        },
      ],
    };

    const { error, status } = await callEdgeFunction(
      'create-order',
      ownerUser.session.access_token,
      orderData
    );

    expect(status).toBeGreaterThanOrEqual(400);
    expect(error).not.toBeNull();
  });
});
