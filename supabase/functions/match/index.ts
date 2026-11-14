import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { handleAction } from './bundle.js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ ok: false, error: 'POST a match action' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ ok: false, error: 'Sign in first' }, 401)

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !service) return json({ ok: false, error: 'Match service is not configured' }, 500)

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ ok: false, error: 'Sign in first' }, 401)

  let body: Parameters<typeof handleAction>[2]
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'The request body was not JSON' }, 400)
  }

  try {
    const admin = createClient(url, service)
    const result = await handleAction(adapter(admin), userData.user.id, body)
    return json(result, 200)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Match failed'
    return json({ ok: false, error: message }, 500)
  }
})

function adapter(admin: SupabaseClient) {
  return {
    async insertMatch(row) {
      const { data, error } = await admin.from('matches').insert(row).select('*').single()
      if (error) throw new Error(error.message)
      return data
    },
    async getByCode(code) {
      const { data, error } = await admin.from('matches').select('*').eq('code', code).maybeSingle()
      if (error) throw new Error(error.message)
      return data ?? null
    },
    async getById(id) {
      const { data, error } = await admin.from('matches').select('*').eq('id', id).maybeSingle()
      if (error) throw new Error(error.message)
      return data ?? null
    },
    async save(id, expectedUpdatedAt, next) {
      const { data, error } = await admin
        .from('matches')
        .update({
          black_id: next.black_id,
          black_civ: next.black_civ,
          state: next.state,
          status: next.status,
          winner: next.winner,
          updated_at: next.updated_at,
        })
        .eq('id', id)
        .eq('updated_at', expectedUpdatedAt)
        .select('*')
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data ?? null
    },
    async getProfile(id) {
      const { data, error } = await admin.from('profiles').select('*').eq('id', id).maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
    async setRating(id, elo, games) {
      const { error } = await admin.from('profiles').update({ elo, games }).eq('id', id)
      if (error) throw new Error(error.message)
    },
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
