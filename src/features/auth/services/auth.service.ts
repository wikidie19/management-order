import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

export async function fetchAdminProfile(session: Session | null) {
  if (!session) return { isAdmin: false, fullName: null }

  const [adminRes, profileRes] = await Promise.all([
    supabase.rpc('is_admin'),
    supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle(),
  ])

  return {
    isAdmin: adminRes.data === true,
    fullName: (profileRes.data?.full_name as string | undefined) ?? session.user.email ?? null,
  }
}

export async function signInAdmin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(
      error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah.' : error.message,
    )
  }

  const profile = await fetchAdminProfile(data.session)
  if (!profile.isAdmin) {
    await supabase.auth.signOut()
    throw new Error('Akun ini tidak memiliki akses admin.')
  }
  return { session: data.session, ...profile }
}

export async function signOut() {
  await supabase.auth.signOut()
}
