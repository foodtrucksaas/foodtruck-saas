import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';

interface Recipient {
  customer_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  email_opt_in: boolean;
  sms_opt_in: boolean;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  try {
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: 'Paramètre manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, foodtruck:foodtrucks(*)')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campagne non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recipients
    const { data: recipients, error: recipientsError } = await supabase
      .rpc('get_campaign_recipients', { p_campaign_id: campaign_id });

    if (recipientsError) {
      console.error('Recipients fetch error');
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des destinataires' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recipientsList = recipients as Recipient[];

    if (recipientsList.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun destinataire trouvé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    let errorCount = 0;

    // Process each recipient
    for (const recipient of recipientsList) {
      const variables = {
        name: recipient.name || 'Client',
        foodtruck: campaign.foodtruck?.name || '',
        location: '', // Could be enhanced with schedule data
        link: `${Deno.env.get('CLIENT_URL') || 'https://yourapp.com'}/${campaign.foodtruck_id}`,
      };

      // Replace variables in content
      const replaceVariables = (text: string) => {
        return text
          .replace(/{name}/g, variables.name)
          .replace(/{foodtruck}/g, variables.foodtruck)
          .replace(/{location}/g, variables.location)
          .replace(/{link}/g, variables.link);
      };

      // Create send record
      const { data: sendRecord } = await supabase
        .from('campaign_sends')
        .insert({
          campaign_id: campaign.id,
          customer_id: recipient.customer_id,
          channel: campaign.channel,
          status: 'pending',
        })
        .select()
        .single();

      // Send email
      if ((campaign.channel === 'email' || campaign.channel === 'both') && recipient.email_opt_in && resend) {
        try {
          const emailBody = replaceVariables(campaign.email_body || '');
          const emailSubject = replaceVariables(campaign.email_subject || '');

          const { data: emailResult, error: emailError } = await resend.emails.send({
            from: `${campaign.foodtruck?.name || 'FoodTruck'} <noreply@${Deno.env.get('RESEND_DOMAIN') || 'resend.dev'}>`,
            to: recipient.email,
            subject: emailSubject,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #ed7b20 0%, #f19744 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">${campaign.foodtruck?.name || 'FoodTruck'}</h1>
                  </div>
                  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="white-space: pre-line;">${emailBody}</p>
                    <div style="margin-top: 30px; text-align: center;">
                      <a href="${variables.link}" style="display: inline-block; background: #ed7b20; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">Commander maintenant</a>
                    </div>
                  </div>
                  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                    <p>Vous recevez cet email car vous avez accepté les communications de ${campaign.foodtruck?.name}.</p>
                    <p><a href="${Deno.env.get('CLIENT_URL') || 'https://yourapp.com'}/unsubscribe?email=${encodeURIComponent(recipient.email)}&foodtruck=${campaign.foodtruck_id}" style="color: #9ca3af;">Se désinscrire</a></p>
                  </div>
                </body>
              </html>
            `,
          });

          if (!emailError && emailResult) {
            await supabase
              .from('campaign_sends')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                resend_id: emailResult.id,
              })
              .eq('id', sendRecord?.id);

            sentCount++;
          } else {
            await supabase
              .from('campaign_sends')
              .update({
                status: 'failed',
                error_message: emailError?.message || 'Unknown error',
              })
              .eq('id', sendRecord?.id);

            errorCount++;
          }
        } catch (e) {
          await supabase
            .from('campaign_sends')
            .update({
              status: 'failed',
              error_message: e.message,
            })
            .eq('id', sendRecord?.id);

          errorCount++;
        }
      }

      // Send SMS
      if ((campaign.channel === 'sms' || campaign.channel === 'both') && recipient.sms_opt_in && recipient.phone && twilioAccountSid) {
        try {
          const smsBody = replaceVariables(campaign.sms_body || '');

          // Format phone number for France
          let phoneNumber = recipient.phone.replace(/\s/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = '+33' + phoneNumber.substring(1);
          }

          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

          const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: phoneNumber,
              From: twilioPhoneNumber || '',
              Body: smsBody,
            }),
          });

          const smsResult = await response.json();

          if (response.ok && smsResult.sid) {
            await supabase
              .from('campaign_sends')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                twilio_sid: smsResult.sid,
              })
              .eq('id', sendRecord?.id);

            // Only count once if both channels
            if (campaign.channel === 'sms') {
              sentCount++;
            }
          } else {
            if (campaign.channel === 'sms') {
              await supabase
                .from('campaign_sends')
                .update({
                  status: 'failed',
                  error_message: smsResult.message || 'SMS send failed',
                })
                .eq('id', sendRecord?.id);

              errorCount++;
            }
          }
        } catch (e) {
          if (campaign.channel === 'sms') {
            await supabase
              .from('campaign_sends')
              .update({
                status: 'failed',
                error_message: e.message,
              })
              .eq('id', sendRecord?.id);

            errorCount++;
          }
        }
      }
    }

    // Update campaign stats
    await supabase
      .from('campaigns')
      .update({
        sent_count: sentCount,
        last_sent_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', campaign_id);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        error_count: errorCount,
        total_recipients: recipientsList.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Campaign send error');
    return new Response(
      JSON.stringify({ error: 'Une erreur est survenue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
