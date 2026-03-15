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
    const { username, password } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Find employee by username
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('username', username)
      .single()

    if (empError || !employee) {
      return new Response(JSON.stringify({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify password (simple comparison for now - password_hash stores plain for demo, should use bcrypt in production)
    if (employee.password_hash !== password) {
      return new Response(JSON.stringify({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!employee.active) {
      return new Response(JSON.stringify({ error: 'Account is inactive', code: 'INACTIVE_ACCOUNT' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check owner subscription
    const { data: ownerProfile } = await supabase
      .from('owner_profiles')
      .select('*')
      .eq('id', employee.owner_id)
      .single()

    if (!ownerProfile) {
      return new Response(JSON.stringify({ error: 'Owner account not found', code: 'OWNER_NOT_FOUND' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!ownerProfile.active) {
      return new Response(JSON.stringify({ error: 'Owner account is blocked', code: 'OWNER_BLOCKED' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (ownerProfile.sub_end) {
      const subEnd = new Date(ownerProfile.sub_end)
      if (subEnd < new Date()) {
        return new Response(JSON.stringify({ error: 'Owner subscription expired', code: 'SUBSCRIPTION_EXPIRED' }), 
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Generate a session token (simple UUID for employee sessions)
    const sessionToken = crypto.randomUUID()

    return new Response(JSON.stringify({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        username: employee.username,
        owner_id: employee.owner_id,
        permissions: employee.permissions,
        active: employee.active,
      },
      owner: {
        id: ownerProfile.id,
        firm_name: ownerProfile.firm_name,
        plan: ownerProfile.plan,
        sub_end: ownerProfile.sub_end,
        active: ownerProfile.active,
      },
      sessionToken,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
