import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin role
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: benutzerData } = await supabaseClient
      .from('benutzer')
      .select('rolle')
      .eq('id', user.id)
      .single();

    if (benutzerData?.rolle !== 'admin') {
      throw new Error('Not authorized - admin role required');
    }

    // Get request body
    const { benutzer_id, email, vorname, nachname } = await req.json();

    if (!benutzer_id || !email) {
      throw new Error('benutzer_id and email are required');
    }

    console.log('Approving benutzer:', { benutzer_id, email });

    // Create auth user with Admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        vorname: vorname || '',
        nachname: nachname || '',
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    console.log('Auth user created:', authUser.user.id);

    // Update benutzer status to approved and set the auth user id
    const { error: updateError } = await supabaseAdmin
      .from('benutzer')
      .update({
        status: 'approved',
        id: authUser.user.id
      })
      .eq('id', benutzer_id);

    if (updateError) {
      console.error('Benutzer update error:', updateError);
      throw new Error(`Failed to update benutzer: ${updateError.message}`);
    }

    // Insert into mitarbeiter table
    const { error: mitarbeiterError } = await supabaseAdmin
      .from('mitarbeiter')
      .insert({
        benutzer_id: authUser.user.id,
        vorname: vorname || null,
        nachname: nachname || null,
        ist_aktiv: true
      });

    if (mitarbeiterError) {
      console.error('Mitarbeiter insert error:', mitarbeiterError);
      throw new Error(`Failed to create mitarbeiter: ${mitarbeiterError.message}`);
    }

    console.log('Benutzer approved successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Benutzer approved and activated' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
