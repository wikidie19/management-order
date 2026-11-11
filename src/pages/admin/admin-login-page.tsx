import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, LockKeyhole } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { FormField } from '@/components/shared/form-field'
import { PageLoader } from '@/components/shared/page-loader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { signInAdmin } from '@/features/auth/services/auth.service'
import { getErrorMessage } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email wajib diisi.').email('Format email tidak valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
})

type LoginValues = z.infer<typeof loginSchema>

export function AdminLoginPage() {
  const { status, session, isAdmin, setAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const from = (location.state as { from?: string } | null)?.from
  const redirectTo = from?.startsWith('/admin/') && from !== '/admin/login' ? from : '/admin/orders'

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (status === 'loading') return <PageLoader />
  if (session && isAdmin) return <Navigate to={redirectTo} replace />

  const onSubmit = async (values: LoginValues) => {
    setFormError(null)
    try {
      const result = await signInAdmin(values.email, values.password)
      setAuth(result)
      toast.success('Berhasil masuk sebagai admin.')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setFormError(getErrorMessage(error, 'Gagal masuk. Silakan coba lagi.'))
    }
  }

  const { errors, isSubmitting } = form.formState

  return (
    <div className="mx-auto w-full max-w-md py-4 sm:py-10">
      <Card>
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-accent text-primary">
            <LockKeyhole className="size-5" />
          </div>
          <CardTitle className="text-xl">Login Admin</CardTitle>
          <CardDescription>Khusus pengurus RT 02 untuk mengelola pesanan kaos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                placeholder="admin@contoh.com"
                aria-invalid={Boolean(errors.email)}
                {...form.register('email')}
              />
            </FormField>
            <FormField label="Kata sandi" htmlFor="password" error={errors.password?.message} required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...form.register('password')}
              />
            </FormField>

            {formError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}

            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
