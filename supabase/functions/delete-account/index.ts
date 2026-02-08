import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { handleCors } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create client with user's token to get user info
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utilisateur non trouvé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create admin client to delete data
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user's foodtruck
    const { data: foodtruck } = await supabaseAdmin
      .from('foodtrucks')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (foodtruck) {
      const foodtruckId = foodtruck.id;

      // Delete in order to respect foreign key constraints
      // 1. Delete campaign sends
      await supabaseAdmin
        .from('campaign_sends')
        .delete()
        .in(
          'campaign_id',
          supabaseAdmin.from('campaigns').select('id').eq('foodtruck_id', foodtruckId)
        );

      // 2. Delete campaigns
      await supabaseAdmin.from('campaigns').delete().eq('foodtruck_id', foodtruckId);

      // 3. Delete loyalty transactions
      await supabaseAdmin
        .from('loyalty_transactions')
        .delete()
        .in(
          'customer_id',
          supabaseAdmin.from('customers').select('id').eq('foodtruck_id', foodtruckId)
        );

      // 4. Delete customer locations
      await supabaseAdmin
        .from('customer_locations')
        .delete()
        .in(
          'customer_id',
          supabaseAdmin.from('customers').select('id').eq('foodtruck_id', foodtruckId)
        );

      // 5. Delete customers
      await supabaseAdmin.from('customers').delete().eq('foodtruck_id', foodtruckId);

      // 6. Delete offer uses
      await supabaseAdmin
        .from('offer_uses')
        .delete()
        .in('offer_id', supabaseAdmin.from('offers').select('id').eq('foodtruck_id', foodtruckId));

      // 7. Delete offer items
      await supabaseAdmin
        .from('offer_items')
        .delete()
        .in('offer_id', supabaseAdmin.from('offers').select('id').eq('foodtruck_id', foodtruckId));

      // 8. Delete offers
      await supabaseAdmin.from('offers').delete().eq('foodtruck_id', foodtruckId);

      // 9. Delete promo code uses
      await supabaseAdmin
        .from('promo_code_uses')
        .delete()
        .in(
          'promo_code_id',
          supabaseAdmin.from('promo_codes').select('id').eq('foodtruck_id', foodtruckId)
        );

      // 10. Delete promo codes
      await supabaseAdmin.from('promo_codes').delete().eq('foodtruck_id', foodtruckId);

      // 11. Delete deal uses
      await supabaseAdmin
        .from('deal_uses')
        .delete()
        .in('deal_id', supabaseAdmin.from('deals').select('id').eq('foodtruck_id', foodtruckId));

      // 12. Delete deals
      await supabaseAdmin.from('deals').delete().eq('foodtruck_id', foodtruckId);

      // 13. Delete order item options
      await supabaseAdmin
        .from('order_item_options')
        .delete()
        .in(
          'order_item_id',
          supabaseAdmin
            .from('order_items')
            .select('id')
            .in(
              'order_id',
              supabaseAdmin.from('orders').select('id').eq('foodtruck_id', foodtruckId)
            )
        );

      // 14. Delete order items
      await supabaseAdmin
        .from('order_items')
        .delete()
        .in('order_id', supabaseAdmin.from('orders').select('id').eq('foodtruck_id', foodtruckId));

      // 15. Delete orders
      await supabaseAdmin.from('orders').delete().eq('foodtruck_id', foodtruckId);

      // 16. Delete menu item options
      await supabaseAdmin
        .from('menu_item_options')
        .delete()
        .in(
          'menu_item_id',
          supabaseAdmin.from('menu_items').select('id').eq('foodtruck_id', foodtruckId)
        );

      // 17. Delete category options
      await supabaseAdmin
        .from('category_options')
        .delete()
        .in(
          'option_group_id',
          supabaseAdmin
            .from('category_option_groups')
            .select('id')
            .in(
              'category_id',
              supabaseAdmin.from('categories').select('id').eq('foodtruck_id', foodtruckId)
            )
        );

      // 18. Delete category option groups
      await supabaseAdmin
        .from('category_option_groups')
        .delete()
        .in(
          'category_id',
          supabaseAdmin.from('categories').select('id').eq('foodtruck_id', foodtruckId)
        );

      // 19. Delete menu items
      await supabaseAdmin.from('menu_items').delete().eq('foodtruck_id', foodtruckId);

      // 20. Delete categories
      await supabaseAdmin.from('categories').delete().eq('foodtruck_id', foodtruckId);

      // 21. Delete schedule exceptions
      await supabaseAdmin.from('schedule_exceptions').delete().eq('foodtruck_id', foodtruckId);

      // 22. Delete schedules
      await supabaseAdmin.from('schedules').delete().eq('foodtruck_id', foodtruckId);

      // 23. Delete locations
      await supabaseAdmin.from('locations').delete().eq('foodtruck_id', foodtruckId);

      // 24. Delete device tokens
      await supabaseAdmin.from('device_tokens').delete().eq('foodtruck_id', foodtruckId);

      // 25. Delete foodtruck images from storage
      const { data: storageFiles } = await supabaseAdmin.storage
        .from('foodtruck-images')
        .list(user.id);

      if (storageFiles && storageFiles.length > 0) {
        await supabaseAdmin.storage
          .from('foodtruck-images')
          .remove(storageFiles.map((f) => `${user.id}/${f.name}`));
      }

      // 26. Delete menu images from storage
      const { data: menuFiles } = await supabaseAdmin.storage.from('menu-images').list(user.id);

      if (menuFiles && menuFiles.length > 0) {
        await supabaseAdmin.storage
          .from('menu-images')
          .remove(menuFiles.map((f) => `${user.id}/${f.name}`));
      }

      // 27. Delete foodtruck
      await supabaseAdmin.from('foodtrucks').delete().eq('id', foodtruckId);
    }

    // 28. Delete the user account
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la suppression du compte' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
