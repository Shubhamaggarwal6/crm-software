import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify caller is super admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify the caller using their JWT
    const callerSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    
    const { data: callerClaims, error: claimsError } = await callerSupabase.auth.getClaims(
      authHeader.replace('Bearer ', '')
    )
    if (claimsError || !callerClaims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check if caller is super admin
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', callerClaims.claims.sub)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Only super admin can create owners' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { email, password, full_name, phone, firm_name, gst_number, address, city, state, state_code, pin_code, plan, max_employees, sub_start, sub_end, invoice_prefix, terms_and_conditions } = body

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'owner' },
    })

    if (authError || !authUser.user) {
      return new Response(JSON.stringify({ error: authError?.message || 'Failed to create user' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = authUser.user.id

    // Profile is auto-created by trigger, but update it
    await supabase.from('profiles').update({ full_name, phone, email }).eq('id', userId)

    // Create owner_profiles
    const { error: ownerError } = await supabase.from('owner_profiles').insert({
      id: userId, firm_name, gst_number, address, city, state, state_code, pin_code,
      plan: plan || 'Basic', max_employees: max_employees || 2,
      sub_start, sub_end, active: true,
      invoice_prefix: invoice_prefix || 'INV',
      terms_and_conditions: terms_and_conditions || '1. Goods once sold will not be taken back.',
      created_by_admin: callerClaims.claims.sub,
    })

    if (ownerError) {
      return new Response(JSON.stringify({ error: ownerError.message }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Create default settings
    await supabase.from('settings').insert({
      user_id: userId, invoice_prefix: invoice_prefix || 'INV',
    })

    return new Response(JSON.stringify({ success: true, userId }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
