import { Outlet, Link, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../lib/auth-store'
import { apiClient } from '../lib/api-client'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦' },
  { label: 'Campaigns', path: '/campaigns', icon: '📢' },
  { label: 'Experiences', path: '/experiences', icon: '✨' },
  { label: 'Content', path: '/content', icon: '📝' },
  { label: 'Components', path: '/components', icon: '🧩' },
  { label: 'Pages', path: '/pages', icon: '📄' },
  { label: 'Targeting', path: '/targeting', icon: '🎯' },
  { label: 'Assets', path: '/dam', icon: '🖼' },
  { label: 'Channels', path: '/channels', icon: '📡' },
  { label: 'SEO', path: '/seo', icon: '🔍' },
  { label: 'Settings', path: '/settings', icon: '⚙' },
]

export function RootLayout() {
  const { user, clearAuth, refreshToken } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken })
      } catch {
        // proceed with local logout even if server call fails
      }
    }
    clearAuth()
    void navigate({ to: '/login' })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r bg-card flex flex-col">
        <div className="h-14 flex items-center px-4 border-b">
          <span className="font-bold text-lg tracking-tight text-primary">IM-CMS</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors [&.active]:text-foreground [&.active]:bg-accent [&.active]:font-medium"
            >
              <span className="w-4 text-center" aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={() => void handleLogout()}
            className="w-full text-xs text-muted-foreground hover:text-foreground text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
