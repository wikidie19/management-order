import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'

import { useAuthListener } from '@/features/auth/hooks/use-auth-listener'
import { isSupabaseConfigured } from '@/lib/supabase'
import { router } from '@/routes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AuthSync() {
  useAuthListener()
  return null
}

function MissingConfig() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-3 p-6">
      <h1 className="text-xl font-bold">Konfigurasi Supabase belum diatur</h1>
      <p className="text-sm text-muted-foreground">
        Salin <code>.env.example</code> menjadi <code>.env</code> lalu isi <code>VITE_SUPABASE_URL</code> dan{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, kemudian jalankan ulang aplikasi.
      </p>
    </div>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <MissingConfig />

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  )
}
