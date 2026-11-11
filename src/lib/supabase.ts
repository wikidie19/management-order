import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined

export const isSupabaseConfigured = Boolean(url && key)

// Only the publishable (anon) key belongs in the frontend; never the service role key.
export const supabase: SupabaseClient = createClient(
  url || 'http://localhost:54321',
  key || 'missing-supabase-key',
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  },
)
