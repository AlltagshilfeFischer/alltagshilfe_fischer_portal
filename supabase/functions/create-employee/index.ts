import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateEmployeeRequest {
  email: string
  password: string
  vorname?: string
  nachname?: string
  telefon?: string
  farbe_kalender?: string
  max_termine_pro_tag?: number
  soll_wochenstunden?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if user is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Not authenticated')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Check if user is admin
    const { data: benutzer, error: benutzerError } = await supabaseAdmin
      .from('benutzer')
      .select('rolle')
      .eq('id', user.id)
      .single()

    if (benutzerError || !benutzer || benutzer.rolle !== 'admin') {
      throw new Error('Not authorized - only admins can create employees')
    }

    const {
      email,
      password,
      vorname,
      nachname,
      telefon,
      farbe_kalender,
      max_termine_pro_tag,
      soll_wochenstunden
    }: CreateEmployeeRequest = await req.json()

    console.log('Creating employee:', { email, vorname, nachname })

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      throw new Error(`Fehler beim Erstellen des Auth-Users: ${authError.message}`)
    }

    const userId = authData.user.id
    console.log('Auth user created:', userId)

    // 2. Create benutzer entry
    const { error: benutzerInsertError } = await supabaseAdmin
      .from('benutzer')
      .insert({
        id: userId,
        email: email,
        vorname: vorname || null,
        nachname: nachname || null,
        rolle: 'mitarbeiter',
      })

    if (benutzerInsertError) {
      console.error('Error creating benutzer:', benutzerInsertError)
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error(`Fehler beim Erstellen des Benutzer-Eintrags: ${benutzerInsertError.message}`)
    }

    console.log('Benutzer entry created')

    // 3. Create mitarbeiter entry
    const { error: mitarbeiterInsertError } = await supabaseAdmin
      .from('mitarbeiter')
      .insert({
        benutzer_id: userId,
        email: email,
        telefon: telefon || null,
        farbe_kalender: farbe_kalender || '#3B82F6',
        max_termine_pro_tag: max_termine_pro_tag || null,
        soll_wochenstunden: soll_wochenstunden || null,
        ist_aktiv: true,
      })

    if (mitarbeiterInsertError) {
      console.error('Error creating mitarbeiter:', mitarbeiterInsertError)
      // Rollback: delete benutzer and auth user
      await supabaseAdmin.from('benutzer').delete().eq('id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error(`Fehler beim Erstellen des Mitarbeiter-Eintrags: ${mitarbeiterInsertError.message}`)
    }

    console.log('Mitarbeiter entry created successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mitarbeiter erfolgreich angelegt',
        user_id: userId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in create-employee function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})