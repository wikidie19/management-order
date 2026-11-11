import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ClipboardList, LogIn, LogOut, Menu, Plus, ShieldCheck, UserCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/features/auth/services/auth.service'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

interface NavItem {
  to: string
  label: string
  icon: typeof ClipboardList
  end?: boolean
}

const publicNav: NavItem[] = [
  { to: '/orders', label: 'Daftar Pesanan', icon: ClipboardList },
  { to: '/admin/login', label: 'Admin Login', icon: LogIn },
]

const adminNav: NavItem[] = [
  { to: '/admin/orders', label: 'Daftar Pesanan', icon: ClipboardList, end: true },
  { to: '/admin/orders/new', label: 'Tambah Pesanan', icon: Plus },
]

export function AppLayout({ variant }: { variant: 'public' | 'admin' }) {
  const { session, isAdmin, fullName } = useAuthStore()
  const navigate = useNavigate()
  const showAdmin = variant === 'admin' && isAdmin
  const nav = showAdmin
    ? adminNav
    : isAdmin
      ? [publicNav[0], { to: '/admin/orders', label: 'Panel Admin', icon: ShieldCheck }]
      : publicNav

  const handleLogout = async () => {
    await signOut()
    toast.success('Anda telah keluar.')
    navigate('/orders', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:px-6">
          <Link to={showAdmin ? '/admin/orders' : '/orders'} className="flex min-w-0 items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="size-8 shrink-0 sm:size-9" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold sm:text-base">Kaos RT 02</p>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">ERTE DUA – GUYUP RUKUN</p>
            </div>
          </Link>

          {showAdmin && (
            <span className="hidden rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground sm:inline">
              Admin
            </span>
          )}

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                  )
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
            {showAdmin && <ProfileMenu name={fullName ?? session?.user.email ?? 'Admin'} onLogout={handleLogout} />}
          </nav>

          <div className="ml-auto md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Buka menu">
                  <Menu className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {showAdmin && (
                  <>
                    <DropdownMenuLabel className="truncate">{fullName ?? session?.user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                  </>
                )}
                {nav.map((item) => (
                  <DropdownMenuItem key={item.to} onSelect={() => navigate(item.to)}>
                    <item.icon />
                    {item.label}
                  </DropdownMenuItem>
                ))}
                {showAdmin && (
                  <>
                    <DropdownMenuItem onSelect={() => navigate('/orders')}>
                      <ClipboardList />
                      Daftar Publik
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                      <LogOut />
                      Keluar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t py-5 text-center text-xs text-muted-foreground">
        Pemesanan Kaos RT 02 – ERTE DUA, GUYUP RUKUN
      </footer>
    </div>
  )
}

function ProfileMenu({ name, onLogout }: { name: string; onLogout: () => void }) {
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="ml-1 max-w-52 gap-2 text-muted-foreground">
          <UserCircle className="size-5" />
          <span className="truncate">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/orders')}>
          <ClipboardList />
          Lihat daftar publik
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onLogout}>
          <LogOut />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
