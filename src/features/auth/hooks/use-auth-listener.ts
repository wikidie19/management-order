import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

import { fetchAdminProfile } from '../services/auth.service'

/** Keeps the auth store in sync with the Supabase session. */
export function useAuthListener() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true
    let currentUserId: string | null | undefined

    const sync = async (session: Parameters<typeof fetchAdminProfile>[0]) => {
      const userId = session?.user.id ?? null
      if (userId !== currentUserId && currentUserId !== undefined) {
        queryClient.removeQueries({ queryKey: ['orders', 'admin'] })
        queryClient.removeQueries({ queryKey: ['orders', 'detail'] })
      }
      currentUserId = userId
      const profile = await fetchAdminProfile(session).catch(() => ({ isAdmin: false, fullName: null }))
      if (active) setAuth({ session, ...profile })
    }

    supabase.auth.getSession().then(({ data }) => sync(data.session))

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return
      // Defer to avoid calling Supabase inside the auth callback.
      setTimeout(() => sync(session), 0)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [setAuth, queryClient])
}
