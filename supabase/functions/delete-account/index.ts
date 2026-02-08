import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Extract the token from the Authorization header
    const token = authHeader.replace('Bearer ', '');

    // Create a client with anon key and pass the user's JWT token to getUser
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user from the JWT token
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(token);

    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Utilisateur non trouvé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
      console.log(`Deleting foodtruck ${foodtruckId} for user ${user.id}`);

      // Helper function to safely delete and log
      const safeDelete = async (table: string, filter: Record<string, any>) => {
        const { error } = await supabaseAdmin.from(table).delete().match(filter);
        if (error) {
          console.error(`Error deleting from ${table}:`, error.message);
        }
      };

      // 1. Get all campaigns for this foodtruck
      const { data: campaigns } = await supabaseAdmin
        .from('campaigns')
        .select('id')
        .eq('foodtruck_id', foodtruckId);

      if (campaigns && campaigns.length > 0) {
        const campaignIds = campaigns.map((c) => c.id);
        // Delete campaign sends
        const { error: csError } = await supabaseAdmin
          .from('campaign_sends')
          .delete()
          .in('campaign_id', campaignIds);
        if (csError) console.error('Error deleting campaign_sends:', csError.message);
      }

      // 2. Delete campaigns
      await safeDelete('campaigns', { foodtruck_id: foodtruckId });

      // 3. Get all customers for this foodtruck
      const { data: customers } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('foodtruck_id', foodtruckId);

      if (customers && customers.length > 0) {
        const customerIds = customers.map((c) => c.id);
        // Delete loyalty transactions
        const { error: ltError } = await supabaseAdmin
          .from('loyalty_transactions')
          .delete()
          .in('customer_id', customerIds);
        if (ltError) console.error('Error deleting loyalty_transactions:', ltError.message);

        // Delete customer locations
        const { error: clError } = await supabaseAdmin
          .from('customer_locations')
          .delete()
          .in('customer_id', customerIds);
        if (clError) console.error('Error deleting customer_locations:', clError.message);
      }

      // 5. Delete customers
      await safeDelete('customers', { foodtruck_id: foodtruckId });

      // 6. Get all offers for this foodtruck
      const { data: offers } = await supabaseAdmin
        .from('offers')
        .select('id')
        .eq('foodtruck_id', foodtruckId);

      if (offers && offers.length > 0) {
        const offerIds = offers.map((o) => o.id);
        // Delete offer uses
        const { error: ouError } = await supabaseAdmin
          .from('offer_uses')
          .delete()
          .in('offer_id', offerIds);
        if (ouError) console.error('Error deleting offer_uses:', ouError.message);

        // Delete offer items
        const { error: oiError } = await supabaseAdmin
          .from('offer_items')
          .delete()
          .in('offer_id', offerIds);
        if (oiError) console.error('Error deleting offer_items:', oiError.message);
      }

      // 8. Delete offers
      await safeDelete('offers', { foodtruck_id: foodtruckId });

      // 9. Get all promo codes for this foodtruck
      const { data: promoCodes } = await supabaseAdmin
        .from('promo_codes')
        .select('id')
        .eq('foodtruck_id', foodtruckId);

      if (promoCodes && promoCodes.length > 0) {
        const promoCodeIds = promoCodes.map((p) => p.id);
        // Delete promo code uses
        const { error: pcuError } = await supabaseAdmin
          .from('promo_code_uses')
          .delete()
          .in('promo_code_id', promoCodeIds);
        if (pcuError) console.error('Error deleting promo_code_uses:', pcuError.message);
      }

      // 10. Delete promo codes
      await safeDelete('promo_codes', { foodtruck_id: foodtruckId });

      // 11. Get all deals for this foodtruck
      const { data: deals } = await supabaseAdmin
        .from('deals')
        .select('id')
        .eq('foodtruck_id', foodtruckId);

      if (deals && deals.length > 0) {
        const dealIds = deals.map((d) => d.id);
        // Delete deal uses
        const { error: duError } = await supabaseAdmin
          .from('deal_uses')
          .delete()
          .in('deal_id', dealIds);
        if (duError) console.error('Error deleting deal_uses:', duError.message);
      }

      // 12. Delete deals
      await safeDelete('deals', { foodtruck_id: foodtruckId });

      // 13. Get all orders for this foodtruck
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('foodtruck_id', foodtruckId);

      if (orders && orders.length > 0) {
        const orderIds = orders.map((o) => o.id);

        // Get all order items
        const { data: orderItems } = await supabaseAdmin
          .from('order_items')
          .select('id')
          .in('order_id', orderIds);

        if (orderItems && orderItems.length > 0) {
          const orderItemIds = orderItems.map((oi) => oi.id);
          // Delete order item options
          const { error: oioError } = await supabaseAdmin
            .from('order_item_options')
            .delete()
            .in('order_item_id', orderItemIds);
          if (oioError) console.error('Error deleting order_item_options:', oioError.message);
        }

        // Delete order items
        const { error: oiError } = await supabaseAdmin
          .from('order_items')
          .delete()
          .in('order_id', orderIds);
        if (oiError) console.error('Error deleting order_items:', oiError.message);
      }

      // 15. Delete orders
      await safeDelete('orders', { foodtruck_id: foodtruckId });

      // 16. Get all menu items for this foodtruck
      const { data: menuItems } = await supabaseAdmin
        .from('menu_items')
        .select('id')
        .eq('foodtruck_id', foodtruckId);

      if (menuItems && menuItems.length > 0) {
        const menuItemIds = menuItems.map((mi) => mi.id);
        // Delete menu item options
        const { error: mioError } = await supabaseAdmin
          .from('menu_item_options')
          .delete()
          .in('menu_item_id', menuItemIds);
        if (mioError) console.error('Error deleting menu_item_options:', mioError.message);
      }

      // 17. Get all categories for this foodtruck
      const { data: categories } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('foodtruck_id', foodtruckId);

      if (categories && categories.length > 0) {
        const categoryIds = categories.map((c) => c.id);

        // Get all option groups for these categories
        const { data: optionGroups } = await supabaseAdmin
          .from('category_option_groups')
          .select('id')
          .in('category_id', categoryIds);

        if (optionGroups && optionGroups.length > 0) {
          const optionGroupIds = optionGroups.map((og) => og.id);
          // Delete category options
          const { error: coError } = await supabaseAdmin
            .from('category_options')
            .delete()
            .in('option_group_id', optionGroupIds);
          if (coError) console.error('Error deleting category_options:', coError.message);
        }

        // Delete category option groups
        const { error: cogError } = await supabaseAdmin
          .from('category_option_groups')
          .delete()
          .in('category_id', categoryIds);
        if (cogError) console.error('Error deleting category_option_groups:', cogError.message);
      }

      // 19. Delete menu items
      await safeDelete('menu_items', { foodtruck_id: foodtruckId });

      // 20. Delete categories
      await safeDelete('categories', { foodtruck_id: foodtruckId });

      // 21. Delete schedule exceptions
      await safeDelete('schedule_exceptions', { foodtruck_id: foodtruckId });

      // 22. Delete schedules
      await safeDelete('schedules', { foodtruck_id: foodtruckId });

      // 23. Delete locations
      await safeDelete('locations', { foodtruck_id: foodtruckId });

      // 24. Delete device tokens
      await safeDelete('device_tokens', { foodtruck_id: foodtruckId });

      // 25. Delete foodtruck images from storage
      try {
        const { data: storageFiles } = await supabaseAdmin.storage
          .from('foodtruck-images')
          .list(user.id);

        if (storageFiles && storageFiles.length > 0) {
          await supabaseAdmin.storage
            .from('foodtruck-images')
            .remove(storageFiles.map((f) => `${user.id}/${f.name}`));
        }
      } catch (storageError) {
        console.error('Error deleting foodtruck images:', storageError);
      }

      // 26. Delete menu images from storage
      try {
        const { data: menuFiles } = await supabaseAdmin.storage.from('menu-images').list(user.id);

        if (menuFiles && menuFiles.length > 0) {
          await supabaseAdmin.storage
            .from('menu-images')
            .remove(menuFiles.map((f) => `${user.id}/${f.name}`));
        }
      } catch (storageError) {
        console.error('Error deleting menu images:', storageError);
      }

      // 27. Delete foodtruck
      const { error: ftDeleteError } = await supabaseAdmin
        .from('foodtrucks')
        .delete()
        .eq('id', foodtruckId);
      if (ftDeleteError) {
        console.error('Error deleting foodtruck:', ftDeleteError.message);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la suppression du foodtruck' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      console.log(`Foodtruck ${foodtruckId} deleted successfully`);
    }

    // 28. Delete the user account
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la suppression du compte' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`User ${user.id} deleted successfully`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur interne',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
