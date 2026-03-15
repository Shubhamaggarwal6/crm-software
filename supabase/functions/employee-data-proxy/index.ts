import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_TABLES = [
  'customers', 'products', 'invoices', 'invoice_items', 'payments',
  'suppliers', 'purchases', 'purchase_items', 'credit_notes', 'credit_note_items',
  'debit_notes', 'bank_accounts', 'settings', 'sequence_counters', 'stock_movements',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { employeeId, ownerId, table, operation, data, filters, columns } = await req.json()

    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: 'Table not allowed' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Validate employee is still active and owner subscription is valid
    const { data: employee } = await supabase
      .from('employees')
      .select('active, owner_id')
      .eq('id', employeeId)
      .single()

    if (!employee || !employee.active || employee.owner_id !== ownerId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: ownerProfile } = await supabase
      .from('owner_profiles')
      .select('active, sub_end')
      .eq('id', ownerId)
      .single()

    if (!ownerProfile?.active) {
      return new Response(JSON.stringify({ error: 'Owner account blocked' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (ownerProfile.sub_end && new Date(ownerProfile.sub_end) < new Date()) {
      return new Response(JSON.stringify({ error: 'Subscription expired' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let result: any

    switch (operation) {
      case 'select': {
        let query = supabase.from(table).select(columns || '*').eq('user_id', ownerId)
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value as any)
          }
        }
        result = await query
        break
      }
      case 'insert': {
        const insertData = Array.isArray(data) 
          ? data.map(d => ({ ...d, user_id: ownerId }))
          : { ...data, user_id: ownerId }
        result = await supabase.from(table).insert(insertData).select()
        break
      }
      case 'update': {
        if (!filters?.id) {
          return new Response(JSON.stringify({ error: 'ID required for update' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        result = await supabase.from(table).update(data).eq('id', filters.id).eq('user_id', ownerId).select()
        break
      }
      case 'delete': {
        if (!filters?.id) {
          return new Response(JSON.stringify({ error: 'ID required for delete' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        result = await supabase.from(table).delete().eq('id', filters.id).eq('user_id', ownerId)
        break
      }
      case 'rpc': {
        // For calling database functions like get_next_sequence
        if (filters?.function_name === 'get_next_sequence') {
          result = await supabase.rpc('get_next_sequence', {
            p_user_id: ownerId,
            p_type: data.counter_type,
            p_fy: data.financial_year,
          })
        }
        break
      }
      default:
        return new Response(JSON.stringify({ error: 'Invalid operation' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (result?.error) {
      return new Response(JSON.stringify({ error: result.error.message }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ data: result?.data }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
