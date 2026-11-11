import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'

type AuthStatus = 'loading' | 'ready'

interface AuthState {
  status: AuthStatus
  session: Session | null
  isAdmin: boolean
  fullName: string | null
  setAuth: (auth: { session: Session | null; isAdmin: boolean; fullName: string | null }) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  session: null,
  isAdmin: false,
  fullName: null,
  setAuth: ({ session, isAdmin, fullName }) => set({ status: 'ready', session, isAdmin, fullName }),
}))
