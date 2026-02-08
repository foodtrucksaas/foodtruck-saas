/**
 * Integration Test Setup
 *
 * Ces tests s'exécutent contre la VRAIE base de données Supabase.
 * Ils créent de vraies données et les suppriment après.
 *
 * IMPORTANT: Ne jamais exécuter en production !
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Charger les variables d'environnement
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required for integration tests');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY is required for integration tests. ' +
      'Get it from Supabase Dashboard > Settings > API > service_role key'
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is required for integration tests');
}

// Client admin avec service role key (peut tout faire)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Client anon (comme un utilisateur normal)
export const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Créer un client authentifié avec un token spécifique
export function createAuthenticatedClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Générer un email unique pour les tests
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}@integration-test.local`;
}

// Générer un mot de passe de test
export function generateTestPassword(): string {
  return `TestPassword123!${Math.random().toString(36).substring(2, 8)}`;
}

// Helper pour créer un utilisateur de test
export async function createTestUser(): Promise<{
  user: { id: string; email: string };
  password: string;
  session: { access_token: string };
}> {
  const email = generateTestEmail();
  const password = generateTestPassword();

  // Créer l'utilisateur avec le client admin
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Confirmer l'email automatiquement
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  // Se connecter pour obtenir un token
  const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    throw new Error(`Failed to sign in test user: ${signInError?.message}`);
  }

  return {
    user: { id: authData.user.id, email },
    password,
    session: { access_token: signInData.session.access_token },
  };
}

// Helper pour supprimer un utilisateur de test
export async function deleteTestUser(userId: string): Promise<void> {
  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (error) {
    console.warn(`Warning: Could not delete test user ${userId}:`, error);
  }
}

// Helper pour créer un foodtruck de test avec toutes ses dépendances
export async function createTestFoodtruck(userId: string): Promise<{
  foodtruck: { id: string; slug: string };
  location: { id: string };
  category: { id: string };
  optionGroup: { id: string };
  option: { id: string };
  menuItem: { id: string };
  schedule: { id: string };
}> {
  const timestamp = Date.now();
  const slug = `test-truck-${timestamp}`;

  // 1. Créer le foodtruck
  const { data: foodtruck, error: ftError } = await supabaseAdmin
    .from('foodtrucks')
    .insert({
      user_id: userId,
      name: `Test Truck ${timestamp}`,
      slug,
      email: `test-${timestamp}@test.com`,
    })
    .select('id, slug')
    .single();

  if (ftError || !foodtruck) {
    throw new Error(`Failed to create test foodtruck: ${ftError?.message}`);
  }

  // 2. Créer un emplacement
  const { data: location, error: locError } = await supabaseAdmin
    .from('locations')
    .insert({
      foodtruck_id: foodtruck.id,
      name: 'Test Location',
      address: '123 Test Street',
      latitude: 48.8566,
      longitude: 2.3522,
    })
    .select('id')
    .single();

  if (locError || !location) {
    throw new Error(`Failed to create test location: ${locError?.message}`);
  }

  // 3. Créer un schedule
  const { data: schedule, error: schedError } = await supabaseAdmin
    .from('schedules')
    .insert({
      foodtruck_id: foodtruck.id,
      location_id: location.id,
      day_of_week: 1,
      start_time: '11:00',
      end_time: '14:00',
      is_active: true,
    })
    .select('id')
    .single();

  if (schedError || !schedule) {
    throw new Error(`Failed to create test schedule: ${schedError?.message}`);
  }

  // 4. Créer une catégorie
  const { data: category, error: catError } = await supabaseAdmin
    .from('categories')
    .insert({
      foodtruck_id: foodtruck.id,
      name: 'Test Category',
      display_order: 0,
    })
    .select('id')
    .single();

  if (catError || !category) {
    throw new Error(`Failed to create test category: ${catError?.message}`);
  }

  // 5. Créer un groupe d'options
  const { data: optionGroup, error: ogError } = await supabaseAdmin
    .from('category_option_groups')
    .insert({
      category_id: category.id,
      name: 'Test Size',
      is_required: true,
      is_multiple: false,
      display_order: 0,
    })
    .select('id')
    .single();

  if (ogError || !optionGroup) {
    throw new Error(`Failed to create test option group: ${ogError?.message}`);
  }

  // 6. Créer une option
  const { data: option, error: optError } = await supabaseAdmin
    .from('category_options')
    .insert({
      option_group_id: optionGroup.id,
      name: 'Medium',
      price_modifier: 0,
      display_order: 0,
    })
    .select('id')
    .single();

  if (optError || !option) {
    throw new Error(`Failed to create test option: ${optError?.message}`);
  }

  // 7. Créer un menu item
  const { data: menuItem, error: miError } = await supabaseAdmin
    .from('menu_items')
    .insert({
      foodtruck_id: foodtruck.id,
      category_id: category.id,
      name: 'Test Item',
      price: 1000,
      is_available: true,
      display_order: 0,
    })
    .select('id')
    .single();

  if (miError || !menuItem) {
    throw new Error(`Failed to create test menu item: ${miError?.message}`);
  }

  return {
    foodtruck,
    location,
    category,
    optionGroup,
    option,
    menuItem,
    schedule,
  };
}

// Helper pour nettoyer toutes les données d'un foodtruck
export async function cleanupTestFoodtruck(foodtruckId: string): Promise<void> {
  try {
    // Supprimer dans l'ordre inverse des dépendances
    await supabaseAdmin.from('schedules').delete().eq('foodtruck_id', foodtruckId);
    await supabaseAdmin.from('locations').delete().eq('foodtruck_id', foodtruckId);
    await supabaseAdmin.from('menu_items').delete().eq('foodtruck_id', foodtruckId);

    // Supprimer les options via les category_option_groups
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('foodtruck_id', foodtruckId);

    if (categories) {
      for (const cat of categories) {
        const { data: optionGroups } = await supabaseAdmin
          .from('category_option_groups')
          .select('id')
          .eq('category_id', cat.id);

        if (optionGroups) {
          for (const og of optionGroups) {
            await supabaseAdmin.from('category_options').delete().eq('option_group_id', og.id);
          }
        }
        await supabaseAdmin.from('category_option_groups').delete().eq('category_id', cat.id);
      }
    }

    await supabaseAdmin.from('categories').delete().eq('foodtruck_id', foodtruckId);
    await supabaseAdmin.from('foodtrucks').delete().eq('id', foodtruckId);
  } catch (error) {
    console.warn(`Warning: Could not cleanup test foodtruck ${foodtruckId}:`, error);
  }
}

// URL des Edge Functions
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Helper pour appeler une Edge Function
export async function callEdgeFunction(
  functionName: string,
  accessToken: string,
  body?: Record<string, unknown>
): Promise<{ data: unknown; error: Error | null; status: number }> {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => null);

    return {
      data,
      error: response.ok ? null : new Error(data?.error || `HTTP ${response.status}`),
      status: response.status,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      status: 0,
    };
  }
}
