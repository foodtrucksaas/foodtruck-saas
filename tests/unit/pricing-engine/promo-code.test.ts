import { describe, it, expect } from 'vitest';
import { promoCodeEngine } from '../../../supabase/functions/_shared/pricing-engine/engines/promo-code';
import { createMockSupabase, makeLineItem, makeContext } from './helpers';

describe('PromoCodeEngine', () => {
  it('returns empty when no promo code provided', async () => {
    const supabase = createMockSupabase();
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 2000, quantity: 1 })],
    });
    const results = await promoCodeEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('applies percentage promo code on runningTotal', async () => {
    const supabase = createMockSupabase({
      rpc: (fnName) => {
        if (fnName === 'validate_offer_promo_code') {
          return {
            data: [
              {
                is_valid: true,
                offer_id: 'promo-1',
                discount_type: 'percentage',
                discount_value: 10,
                max_discount: null,
                calculated_discount: 200, // 10% of 2000 runningTotal
                error_message: null,
              },
            ],
            error: null,
          };
        }
        return { data: null, error: { message: 'unknown' } };
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 2000, quantity: 1 })],
      promoCode: 'BIENVENUE',
      customer: { email: 'test@test.com' },
    });

    const results = await promoCodeEngine.evaluate(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('promo_code');
    expect(results[0].amount).toBe(200);
    expect(results[0].label).toBe('Code promo : BIENVENUE');
    expect(results[0].offer_id).toBe('promo-1');
  });

  it('applies fixed promo code', async () => {
    const supabase = createMockSupabase({
      rpc: (fnName) => {
        if (fnName === 'validate_offer_promo_code') {
          return {
            data: [
              {
                is_valid: true,
                offer_id: 'promo-2',
                discount_type: 'fixed',
                discount_value: 500,
                max_discount: null,
                calculated_discount: 500,
                error_message: null,
              },
            ],
            error: null,
          };
        }
        return { data: null, error: { message: 'unknown' } };
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 3000, quantity: 1 })],
      promoCode: 'CINQ',
      customer: { email: 'test@test.com' },
    });

    const results = await promoCodeEngine.evaluate(ctx);
    expect(results[0].amount).toBe(500);
  });

  it('returns empty for invalid promo code', async () => {
    const supabase = createMockSupabase({
      rpc: (fnName) => {
        if (fnName === 'validate_offer_promo_code') {
          return {
            data: [
              {
                is_valid: false,
                offer_id: null,
                discount_type: null,
                discount_value: null,
                max_discount: null,
                calculated_discount: null,
                error_message: 'Code promo invalide',
              },
            ],
            error: null,
          };
        }
        return { data: null, error: { message: 'unknown' } };
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 2000, quantity: 1 })],
      promoCode: 'FAKE',
      customer: { email: 'test@test.com' },
    });

    const results = await promoCodeEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('caps discount at runningTotal', async () => {
    const supabase = createMockSupabase({
      rpc: (fnName) => {
        if (fnName === 'validate_offer_promo_code') {
          return {
            data: [
              {
                is_valid: true,
                offer_id: 'promo-3',
                discount_type: 'fixed',
                discount_value: 9999,
                max_discount: null,
                calculated_discount: 9999,
                error_message: null,
              },
            ],
            error: null,
          };
        }
        return { data: null, error: { message: 'unknown' } };
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 500, quantity: 1 })],
      promoCode: 'MEGA',
      customer: { email: 'test@test.com' },
    });

    const results = await promoCodeEngine.evaluate(ctx);
    expect(results[0].amount).toBe(500); // Capped at runningTotal
  });

  it('uses runningTotal (cascade) for percentage', async () => {
    const supabase = createMockSupabase({
      rpc: (fnName, params) => {
        if (fnName === 'validate_offer_promo_code') {
          // RPC receives the runningTotal (900), not the subtotal (1000)
          const orderAmount = (params as Record<string, number>).p_order_amount;
          return {
            data: [
              {
                is_valid: true,
                offer_id: 'promo-4',
                discount_type: 'percentage',
                discount_value: 10,
                max_discount: null,
                calculated_discount: Math.floor((orderAmount * 10) / 100),
                error_message: null,
              },
            ],
            error: null,
          };
        }
        return { data: null, error: { message: 'unknown' } };
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 1000, quantity: 1 })],
      promoCode: 'CASCADE',
      customer: { email: 'test@test.com' },
    });

    // Simulate previous discount
    ctx.runningTotal = 900;

    const results = await promoCodeEngine.evaluate(ctx);
    // 10% of 900 = 90 (not 10% of 1000 = 100)
    expect(results[0].amount).toBe(90);
  });

  it('decreases runningTotal', async () => {
    const supabase = createMockSupabase({
      rpc: (fnName) => {
        if (fnName === 'validate_offer_promo_code') {
          return {
            data: [
              {
                is_valid: true,
                offer_id: 'promo-5',
                discount_type: 'fixed',
                discount_value: 300,
                max_discount: null,
                calculated_discount: 300,
                error_message: null,
              },
            ],
            error: null,
          };
        }
        return { data: null, error: { message: 'unknown' } };
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 1000, quantity: 1 })],
      promoCode: 'TEST',
    });

    expect(ctx.runningTotal).toBe(1000);
    await promoCodeEngine.evaluate(ctx);
    expect(ctx.runningTotal).toBe(700);
  });
});
