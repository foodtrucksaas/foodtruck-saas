import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Create user
    const email = 'projetbonzai@gmail.com';
    const password = 'azerty';

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log('User already exists:', userId);
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) throw createError;
      userId = newUser.user!.id;
      console.log('User created:', userId);
    }

    // 2. Create user record
    await supabase.from('users').upsert({ id: userId, role: 'gestionnaire' });

    // 3. Delete existing foodtruck for this user
    await supabase.from('foodtrucks').delete().eq('user_id', userId);

    // 4. Create Foodtruck
    const { data: foodtruck, error: ftError } = await supabase
      .from('foodtrucks')
      .insert({
        user_id: userId,
        name: 'La Pizza du Chef',
        description: 'Pizzas artisanales cuites au feu de bois. Pâte fraîche préparée chaque jour avec des ingrédients de qualité. Venez découvrir nos créations gourmandes !',
        cuisine_types: ['Pizza', 'Italien'],
        is_active: true,
        auto_accept_orders: false,
        show_order_popup: true,
        show_menu_photos: true,
        loyalty_enabled: true,
        loyalty_points_per_euro: 1,
        loyalty_threshold: 100,
        loyalty_reward: 500,
        max_orders_per_slot: 5,
      })
      .select()
      .single();

    if (ftError) throw ftError;
    const foodtruckId = foodtruck.id;

    // 5. Create Locations
    const { data: locations } = await supabase
      .from('locations')
      .insert([
        { foodtruck_id: foodtruckId, name: 'Marché de Fontevraud', address: 'Place du Marché, 49590 Fontevraud-l\'Abbaye', latitude: 47.1847, longitude: 0.0517 },
        { foodtruck_id: foodtruckId, name: 'Parking Leclerc Saumur', address: 'Avenue du Général de Gaulle, 49400 Saumur', latitude: 47.2608, longitude: -0.0769 },
      ])
      .select();

    const locMarche = locations![0].id;
    const locParking = locations![1].id;

    // 6. Create Schedules
    await supabase.from('schedules').insert([
      { foodtruck_id: foodtruckId, location_id: locMarche, day_of_week: 3, start_time: '11:00', end_time: '14:00', is_active: true },
      { foodtruck_id: foodtruckId, location_id: locMarche, day_of_week: 6, start_time: '11:00', end_time: '14:00', is_active: true },
      { foodtruck_id: foodtruckId, location_id: locParking, day_of_week: 5, start_time: '11:30', end_time: '14:30', is_active: true },
    ]);

    // 7. Create Categories
    const { data: categories } = await supabase
      .from('categories')
      .insert([
        { foodtruck_id: foodtruckId, name: 'Entrées', display_order: 0 },
        { foodtruck_id: foodtruckId, name: 'Pizzas', display_order: 1 },
        { foodtruck_id: foodtruckId, name: 'Boissons', display_order: 2 },
        { foodtruck_id: foodtruckId, name: 'Desserts', display_order: 3 },
      ])
      .select();

    const catEntrees = categories!.find(c => c.name === 'Entrées')!.id;
    const catPizzas = categories!.find(c => c.name === 'Pizzas')!.id;
    const catBoissons = categories!.find(c => c.name === 'Boissons')!.id;
    const catDesserts = categories!.find(c => c.name === 'Desserts')!.id;

    // 8. Create Category Option Groups for Pizzas
    const { data: optionGroups } = await supabase
      .from('category_option_groups')
      .insert([
        { category_id: catPizzas, name: 'Taille', is_required: true, is_multiple: false, display_order: 0 },
        { category_id: catPizzas, name: 'Suppléments', is_required: false, is_multiple: true, display_order: 1 },
        { category_id: catPizzas, name: 'Base', is_required: true, is_multiple: false, display_order: 2 },
      ])
      .select();

    const grpTaille = optionGroups!.find(g => g.name === 'Taille')!.id;
    const grpSupplements = optionGroups!.find(g => g.name === 'Suppléments')!.id;
    const grpBase = optionGroups!.find(g => g.name === 'Base')!.id;

    // 9. Create Category Options
    await supabase.from('category_options').insert([
      // Tailles
      { option_group_id: grpTaille, name: 'Medium (26cm)', price_modifier: 0, is_available: true, is_default: true, display_order: 0 },
      { option_group_id: grpTaille, name: 'Large (33cm)', price_modifier: 300, is_available: true, is_default: false, display_order: 1 },
      { option_group_id: grpTaille, name: 'XXL (40cm)', price_modifier: 600, is_available: true, is_default: false, display_order: 2 },
      // Suppléments
      { option_group_id: grpSupplements, name: 'Mozzarella supplémentaire', price_modifier: 150, is_available: true, is_default: false, display_order: 0 },
      { option_group_id: grpSupplements, name: 'Champignons', price_modifier: 100, is_available: true, is_default: false, display_order: 1 },
      { option_group_id: grpSupplements, name: 'Jambon', price_modifier: 150, is_available: true, is_default: false, display_order: 2 },
      { option_group_id: grpSupplements, name: 'Oeuf', price_modifier: 100, is_available: true, is_default: false, display_order: 3 },
      { option_group_id: grpSupplements, name: 'Anchois', price_modifier: 150, is_available: true, is_default: false, display_order: 4 },
      { option_group_id: grpSupplements, name: 'Olives', price_modifier: 100, is_available: true, is_default: false, display_order: 5 },
      // Base
      { option_group_id: grpBase, name: 'Sauce tomate', price_modifier: 0, is_available: true, is_default: true, display_order: 0 },
      { option_group_id: grpBase, name: 'Crème fraîche', price_modifier: 0, is_available: true, is_default: false, display_order: 1 },
    ]);

    // 10. Create Menu Items (prices in centimes)
    // Entrées
    const { error: entreesError } = await supabase.from('menu_items').insert([
      { foodtruck_id: foodtruckId, category_id: catEntrees, name: 'Bruschetta', description: 'Pain grillé, tomates fraîches, basilic, huile d\'olive', price: 550, is_available: true, display_order: 0, allergens: ['Gluten'] },
      { foodtruck_id: foodtruckId, category_id: catEntrees, name: 'Salade Caprese', description: 'Tomates, mozzarella di bufala, basilic frais', price: 700, is_available: true, display_order: 1, allergens: ['Lait'] },
      { foodtruck_id: foodtruckId, category_id: catEntrees, name: 'Arancini (3 pièces)', description: 'Boulettes de risotto frites, coeur mozzarella', price: 650, is_available: true, display_order: 2, allergens: ['Gluten', 'Lait', 'Oeuf'] },
    ]);
    if (entreesError) console.error('Entrees error:', entreesError);

    // Pizzas
    const { data: pizzas, error: pizzasError } = await supabase.from('menu_items').insert([
      { foodtruck_id: foodtruckId, category_id: catPizzas, name: 'Margherita', description: 'Sauce tomate, mozzarella, basilic frais', price: 900, is_available: true, display_order: 0, allergens: ['Gluten', 'Lait'] },
      { foodtruck_id: foodtruckId, category_id: catPizzas, name: 'Reine', description: 'Sauce tomate, mozzarella, jambon, champignons', price: 1100, is_available: true, display_order: 1, allergens: ['Gluten', 'Lait'] },
      { foodtruck_id: foodtruckId, category_id: catPizzas, name: '4 Fromages', description: 'Mozzarella, gorgonzola, parmesan, chèvre', price: 1200, is_available: true, display_order: 2, allergens: ['Gluten', 'Lait'] },
      { foodtruck_id: foodtruckId, category_id: catPizzas, name: 'Calzone', description: 'Pizza pliée : jambon, mozzarella, oeuf, champignons', price: 1250, is_available: true, display_order: 3, allergens: ['Gluten', 'Lait', 'Oeuf'] },
      { foodtruck_id: foodtruckId, category_id: catPizzas, name: 'Veggie', description: 'Sauce tomate, mozzarella, poivrons, aubergines, courgettes, olives', price: 1150, is_available: true, display_order: 4, allergens: ['Gluten', 'Lait'] },
      { foodtruck_id: foodtruckId, category_id: catPizzas, name: 'Chorizo', description: 'Sauce tomate, mozzarella, chorizo, poivrons, oignons', price: 1200, is_available: true, display_order: 5, allergens: ['Gluten', 'Lait'] },
      { foodtruck_id: foodtruckId, category_id: catPizzas, name: 'Pizza du Chef', description: 'Création du jour - Demandez-nous !', price: 1300, is_available: true, is_daily_special: true, display_order: 6, allergens: ['Gluten', 'Lait'] },
    ]).select();
    if (pizzasError) throw new Error('Pizzas insert error: ' + JSON.stringify(pizzasError));

    // Boissons
    await supabase.from('menu_items').insert([
      { foodtruck_id: foodtruckId, category_id: catBoissons, name: 'Coca-Cola 33cl', description: '', price: 250, is_available: true, display_order: 0 },
      { foodtruck_id: foodtruckId, category_id: catBoissons, name: 'Coca-Cola Zero 33cl', description: '', price: 250, is_available: true, display_order: 1 },
      { foodtruck_id: foodtruckId, category_id: catBoissons, name: 'Orangina 33cl', description: '', price: 250, is_available: true, display_order: 2 },
      { foodtruck_id: foodtruckId, category_id: catBoissons, name: 'Eau minérale 50cl', description: '', price: 150, is_available: true, display_order: 3 },
      { foodtruck_id: foodtruckId, category_id: catBoissons, name: 'Perrier 33cl', description: '', price: 250, is_available: true, display_order: 4 },
      { foodtruck_id: foodtruckId, category_id: catBoissons, name: 'Thé glacé pêche 33cl', description: '', price: 250, is_available: true, display_order: 5 },
    ]);

    // Desserts
    await supabase.from('menu_items').insert([
      { foodtruck_id: foodtruckId, category_id: catDesserts, name: 'Tiramisu maison', description: 'Mascarpone, café, cacao', price: 500, is_available: true, display_order: 0, allergens: ['Gluten', 'Lait', 'Oeuf'] },
      { foodtruck_id: foodtruckId, category_id: catDesserts, name: 'Panna Cotta', description: 'Coulis de fruits rouges', price: 450, is_available: true, display_order: 1, allergens: ['Lait'] },
      { foodtruck_id: foodtruckId, category_id: catDesserts, name: 'Cannoli sicilien', description: 'Ricotta, pépites de chocolat, pistache', price: 400, is_available: true, display_order: 2, allergens: ['Gluten', 'Lait', 'Fruits à coque'] },
    ]);

    // 11. Create Offers
    await supabase.from('offers').insert([
      {
        foodtruck_id: foodtruckId,
        name: 'Menu Midi',
        description: 'Pizza Medium + Boisson + Dessert',
        offer_type: 'bundle',
        config: { fixed_price: 1500 },
        is_active: true,
        stackable: false,
      },
      {
        foodtruck_id: foodtruckId,
        name: 'Bienvenue !',
        description: '10% de réduction sur votre première commande',
        offer_type: 'promo_code',
        config: { code: 'BIENVENUE', discount_type: 'percentage', discount_value: 10, min_order_amount: 1500 },
        is_active: true,
        max_uses_per_customer: 1,
      },
      {
        foodtruck_id: foodtruckId,
        name: 'Happy Hour',
        description: '-15% entre 11h et 11h30',
        offer_type: 'happy_hour',
        config: { discount_type: 'percentage', discount_value: 15, applies_to: 'all' },
        is_active: true,
        time_start: '11:00',
        time_end: '11:30',
        days_of_week: [3, 5, 6],
      },
      {
        foodtruck_id: foodtruckId,
        name: 'Soirée Pizza',
        description: 'Dès 30€ d\'achat = -10% sur le total',
        offer_type: 'threshold_discount',
        config: { min_amount: 3000, discount_type: 'percentage', discount_value: 10 },
        is_active: true,
      },
    ]);

    // 12. Create sample customers
    await supabase.from('customers').insert([
      { foodtruck_id: foodtruckId, email: 'marie.dupont@email.com', name: 'Marie Dupont', phone: '0612345678', email_opt_in: true, sms_opt_in: true, loyalty_opt_in: true, loyalty_points: 45, lifetime_points: 145, total_orders: 5, total_spent: 7850 },
      { foodtruck_id: foodtruckId, email: 'jean.martin@email.com', name: 'Jean Martin', phone: '0698765432', email_opt_in: true, sms_opt_in: false, loyalty_opt_in: true, loyalty_points: 120, lifetime_points: 220, total_orders: 8, total_spent: 12400 },
      { foodtruck_id: foodtruckId, email: 'sophie.bernard@email.com', name: 'Sophie Bernard', phone: null, email_opt_in: true, sms_opt_in: false, loyalty_opt_in: false, loyalty_points: 0, lifetime_points: 0, total_orders: 2, total_spent: 2500 },
      { foodtruck_id: foodtruckId, email: 'pierre.durand@email.com', name: 'Pierre Durand', phone: '0654321098', email_opt_in: false, sms_opt_in: false, loyalty_opt_in: true, loyalty_points: 80, lifetime_points: 80, total_orders: 3, total_spent: 4200 },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo data created successfully',
        foodtruck_id: foodtruckId,
        user_id: userId,
        email: email,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
