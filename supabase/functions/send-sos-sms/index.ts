import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Contact {
  phone: string;
  name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, contacts } = await req.json();

    if (!latitude || !longitude || !contacts || !Array.isArray(contacts)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: latitude, longitude, contacts' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ error: 'Twilio configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    const timestamp = new Date().toLocaleString();
    
    const results = [];

    // Send SMS to each contact
    for (const contact of contacts as Contact[]) {
      try {
        const message = `🚨 SOS Alert from ${contact.name}! I need help.\nLocation: ${locationUrl}\nTime: ${timestamp}`;
        
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: contact.phone,
              From: twilioPhoneNumber,
              Body: message,
            }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          console.log(`SMS sent successfully to ${contact.phone}:`, data.sid);
          results.push({ phone: contact.phone, success: true, sid: data.sid });
        } else {
          console.error(`Failed to send SMS to ${contact.phone}:`, data);
          results.push({ phone: contact.phone, success: false, error: data.message });
        }
      } catch (error) {
        console.error(`Error sending SMS to ${contact.phone}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ phone: contact.phone, success: false, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-sos-sms function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
