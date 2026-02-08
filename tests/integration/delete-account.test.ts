/**
 * Integration Tests for delete-account Edge Function
 *
 * Ces tests vérifient que la suppression de compte fonctionne
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

describe('delete-account Edge Function', () => {
  // Test 1: Suppression d'un compte sans foodtruck
  describe('User without foodtruck', () => {
    let testUser: { user: { id: string; email: string }; session: { access_token: string } };

    beforeAll(async () => {
      testUser = await createTestUser();
    });

    afterAll(async () => {
      // Cleanup au cas où le test échoue
      if (testUser?.user?.id) {
        await deleteTestUser(testUser.user.id);
      }
    });

    it('should delete user account successfully', async () => {
      const { data, error, status } = await callEdgeFunction(
        'delete-account',
        testUser.session.access_token
      );

      expect(status).toBe(200);
      expect(error).toBeNull();
      expect(data).toEqual({ success: true });

      // Vérifier que l'utilisateur n'existe plus
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(testUser.user.id);
      expect(userData.user).toBeNull();
    });
  });

  // Test 2: Suppression d'un compte avec foodtruck complet
  describe('User with complete foodtruck', () => {
    let testUser: { user: { id: string; email: string }; session: { access_token: string } };
    let testData: Awaited<ReturnType<typeof createTestFoodtruck>>;

    beforeAll(async () => {
      testUser = await createTestUser();
      testData = await createTestFoodtruck(testUser.user.id);
    });

    afterAll(async () => {
      // Cleanup au cas où le test échoue
      if (testData?.foodtruck?.id) {
        await cleanupTestFoodtruck(testData.foodtruck.id);
      }
      if (testUser?.user?.id) {
        await deleteTestUser(testUser.user.id);
      }
    });

    it('should delete all foodtruck data and user account', async () => {
      const foodtruckId = testData.foodtruck.id;
      const categoryId = testData.category.id;
      const optionGroupId = testData.optionGroup.id;

      // Vérifier que les données existent avant suppression
      const { data: beforeFoodtruck } = await supabaseAdmin
        .from('foodtrucks')
        .select('id')
        .eq('id', foodtruckId)
        .single();
      expect(beforeFoodtruck).not.toBeNull();

      const { data: beforeCategory } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('id', categoryId)
        .single();
      expect(beforeCategory).not.toBeNull();

      const { data: beforeOptionGroup } = await supabaseAdmin
        .from('category_option_groups')
        .select('id')
        .eq('id', optionGroupId)
        .single();
      expect(beforeOptionGroup).not.toBeNull();

      const { data: beforeOption } = await supabaseAdmin
        .from('category_options')
        .select('id')
        .eq('option_group_id', optionGroupId);
      expect(beforeOption).toHaveLength(1);

      // Appeler la fonction de suppression
      const { data, error, status } = await callEdgeFunction(
        'delete-account',
        testUser.session.access_token
      );

      expect(status).toBe(200);
      expect(error).toBeNull();
      expect(data).toEqual({ success: true });

      // Vérifier que TOUT a été supprimé
      const { data: afterFoodtruck } = await supabaseAdmin
        .from('foodtrucks')
        .select('id')
        .eq('id', foodtruckId)
        .single();
      expect(afterFoodtruck).toBeNull();

      const { data: afterCategory } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('id', categoryId)
        .single();
      expect(afterCategory).toBeNull();

      const { data: afterOptionGroup } = await supabaseAdmin
        .from('category_option_groups')
        .select('id')
        .eq('id', optionGroupId)
        .single();
      expect(afterOptionGroup).toBeNull();

      const { data: afterOption } = await supabaseAdmin
        .from('category_options')
        .select('id')
        .eq('option_group_id', optionGroupId);
      expect(afterOption).toHaveLength(0);

      const { data: afterLocation } = await supabaseAdmin
        .from('locations')
        .select('id')
        .eq('foodtruck_id', foodtruckId);
      expect(afterLocation).toHaveLength(0);

      const { data: afterSchedule } = await supabaseAdmin
        .from('schedules')
        .select('id')
        .eq('foodtruck_id', foodtruckId);
      expect(afterSchedule).toHaveLength(0);

      const { data: afterMenuItem } = await supabaseAdmin
        .from('menu_items')
        .select('id')
        .eq('foodtruck_id', foodtruckId);
      expect(afterMenuItem).toHaveLength(0);

      // Vérifier que l'utilisateur n'existe plus
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(testUser.user.id);
      expect(userData.user).toBeNull();
    });
  });

  // Test 3: Erreur sans token d'authentification
  describe('Without authentication', () => {
    it('should return 401 without auth token', async () => {
      const response = await fetch(
        `${process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Non autorisé');
    });

    it('should return 401 with invalid token', async () => {
      const response = await fetch(
        `${process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer invalid-token-12345',
          },
        }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Utilisateur non trouvé');
    });
  });

  // Test 4: Vérification des noms de colonnes (le bug qu'on a corrigé)
  describe('Database schema validation', () => {
    it('should have correct column names in category_options table', async () => {
      // Ce test vérifie que la colonne s'appelle bien option_group_id
      const { data, error } = await supabaseAdmin
        .from('category_options')
        .select('option_group_id')
        .limit(1);

      // Si la colonne n'existe pas, on aura une erreur
      expect(error).toBeNull();
      // data peut être vide, c'est ok
      expect(Array.isArray(data)).toBe(true);
    });

    it('should NOT have category_option_group_id column', async () => {
      // Ce test vérifie que l'ancienne colonne n'existe pas
      const { error } = await supabaseAdmin
        .from('category_options')
        .select('category_option_group_id' as any)
        .limit(1);

      // On s'attend à une erreur car cette colonne n'existe pas
      expect(error).not.toBeNull();
    });
  });
});
