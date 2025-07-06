
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferNotificationRequest {
  recipientEmail: string;
  senderName: string;
  amount: number;
  currency: string;
  description?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { recipientEmail, senderName, amount, currency, description }: TransferNotificationRequest = await req.json();

    // In a real implementation, you would use a service like Resend to send emails
    // For now, we'll log the notification
    console.log(`Transfer notification: ${recipientEmail} received ${amount} ${currency} from ${senderName}`);
    
    // You could also store the notification in a database table
    const { error } = await supabaseClient
      .from('notifications')
      .insert({
        recipient_email: recipientEmail,
        type: 'transfer_received',
        message: `You received ${amount} ${currency} from ${senderName}`,
        metadata: {
          sender: senderName,
          amount,
          currency,
          description
        }
      });

    if (error) {
      console.error('Error storing notification:', error);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-transfer-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};

serve(handler);
