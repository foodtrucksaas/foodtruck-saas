/**
 * Integration Tests for get_foodtruck_access_state RPC
 *
 * Verifies that anonymous clients can read the access state
 * of a foodtruck via the SECURITY DEFINER RPC.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabaseAdmin, supabaseAnon, createTestUser, deleteTestUser } from './setup';

describe('get_foodtruck_access_state RPC', () => {
  let ownerUser: { user: { id: string; email: string }; session: { access_token: string } };
  let foodtruckId: string;

  beforeAll(async () => {
    ownerUser = await createTestUser();

    // Create a single foodtruck (unique constraint: one per user)
    const slug = `test-access-${Date.now()}`;
    const { data, error } = await supabaseAdmin
      .from('foodtrucks')
      .insert({
        user_id: ownerUser.user.id,
        name: 'Test Access State',
        slug,
        cuisine_types: ['test'],
      })
      .select('id')
      .single();

    if (error) throw error;
    foodtruckId = data.id;
  });

  afterAll(async () => {
    if (foodtruckId) {
      await supabaseAdmin.from('subscriptions').delete().eq('foodtruck_id', foodtruckId);
      await supabaseAdmin.from('foodtrucks').delete().eq('id', foodtruckId);
    }
    if (ownerUser?.user?.id) {
      await deleteTestUser(ownerUser.user.id);
    }
  });

  async function setSubscriptionStatus(status: string) {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ status })
      .eq('foodtruck_id', foodtruckId);
    if (error) throw error;
  }

  async function callRpc(id: string) {
    return supabaseAnon.rpc('get_foodtruck_access_state', { p_foodtruck_id: id });
  }

  it('returns "full" for trialing foodtruck (anon)', async () => {
    // Trigger creates subscription as 'trialing' by default
    const { data, error } = await callRpc(foodtruckId);
    expect(error).toBeNull();
    expect(data).toBe('full');
  });

  it('returns "full" for active foodtruck (anon)', async () => {
    await setSubscriptionStatus('active');
    const { data, error } = await callRpc(foodtruckId);
    expect(error).toBeNull();
    expect(data).toBe('full');
  });

  it('returns "full" for past_due foodtruck (anon)', async () => {
    await setSubscriptionStatus('past_due');
    const { data, error } = await callRpc(foodtruckId);
    expect(error).toBeNull();
    expect(data).toBe('full');
  });

  it('returns "degraded" for expired_trial foodtruck (anon)', async () => {
    await setSubscriptionStatus('expired_trial');
    const { data, error } = await callRpc(foodtruckId);
    expect(error).toBeNull();
    expect(data).toBe('degraded');
  });

  it('returns "degraded" for canceled foodtruck (anon)', async () => {
    await setSubscriptionStatus('canceled');
    const { data, error } = await callRpc(foodtruckId);
    expect(error).toBeNull();
    expect(data).toBe('degraded');
  });

  it('returns "degraded" for unpaid foodtruck (anon)', async () => {
    await setSubscriptionStatus('unpaid');
    const { data, error } = await callRpc(foodtruckId);
    expect(error).toBeNull();
    expect(data).toBe('degraded');
  });

  it('returns "full" for non-existent foodtruck (no subscription)', async () => {
    const { data, error } = await callRpc('00000000-0000-0000-0000-000000000000');
    expect(error).toBeNull();
    expect(data).toBe('full');
  });
});
