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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const callerSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    
    const { data: { user }, error: userError } = await callerSupabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get all owners with profiles
    const { data: owners } = await supabase
      .from('owner_profiles')
      .select('*, profiles!inner(full_name, email, phone)')

    const { data: allEmployees } = await supabase.from('employees').select('id, owner_id')
    const { data: allInvoices } = await supabase.from('invoices').select('id, total, user_id')

    const now = new Date()
    const weekFromNow = new Date(now)
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    const totalOwners = owners?.length || 0
    const activeOwners = owners?.filter(o => o.active && (!o.sub_end || new Date(o.sub_end) >= now)).length || 0
    const expiringThisWeek = owners?.filter(o => {
      if (!o.sub_end) return false
      const end = new Date(o.sub_end)
      return end >= now && end <= weekFromNow
    }).length || 0
    const expired = owners?.filter(o => o.sub_end && new Date(o.sub_end) < now).length || 0
    const totalInvoices = allInvoices?.length || 0
    const totalRevenue = allInvoices?.reduce((s: number, i: any) => s + (i.total || 0), 0) || 0

    return new Response(JSON.stringify({
      totalOwners, activeOwners, expiringThisWeek, expired,
      totalInvoices, totalRevenue,
      owners: owners?.map(o => ({
        id: o.id, firmName: o.firm_name, plan: o.plan,
        subStart: o.sub_start, subEnd: o.sub_end, active: o.active,
        maxEmployees: o.max_employees,
        employeeCount: allEmployees?.filter(e => e.owner_id === o.id).length || 0,
        fullName: (o as any).profiles?.full_name,
        email: (o as any).profiles?.email,
        phone: (o as any).profiles?.phone,
      })) || [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
