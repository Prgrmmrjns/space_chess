import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { MatchAction, MatchResult } from './server'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && key)

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!url || !key) throw new Error('Supabase is not configured')
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return client
}

export async function callMatch(body: MatchAction): Promise<MatchResult> {
  const { data, error } = await supabase().functions.invoke('match', { body })
  if (data && typeof data === 'object' && 'ok' in data) return data as MatchResult
  return { ok: false, error: error?.message ?? 'The match service did not answer' }
}
