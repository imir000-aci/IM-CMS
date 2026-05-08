import React, { useState } from 'react'
import { Outlet, Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard, Megaphone, Sparkles, FileText, Puzzle,
  Files, Target, Image, Radio, Search, Settings, Users,
  Globe, FlaskConical, Layers, Boxes, ChevronDown, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '../lib/auth-store'
import { apiClient } from '../lib/api-client'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  children?: NavItem[]
}

const NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Campaigns', path: '/campaigns', icon: <Megaphone className="h-4 w-4" /> },
  { label: 'Experiences', path: '/experiences', icon: <Sparkles className="h-4 w-4" /> },
  { label: 'Content', path: '/content', icon: <FileText className="h-4 w-4" /> },
  {
    label: 'Components', path: '/components', icon: <Puzzle className="h-4 w-4" />,
    children: [
      { label: 'Library', path: '/components', icon: <Puzzle className="h-4 w-4" /> },
      { label: 'Instances', path: '/component-instances', icon: <Boxes className="h-4 w-4" /> },
      { label: 'Pools', path: '/component-pools', icon: <Layers className="h-4 w-4" /> },
    ],
  },
  { label: 'Pages', path: '/pages', icon: <Files className="h-4 w-4" /> },
  { label: 'Targeting', path: '/targeting', icon: <Target className="h-4 w-4" /> },
  { label: 'Assets', path: '/dam', icon: <Image className="h-4 w-4" /> },
  { label: 'Channels', path: '/channels', icon: <Radio className="h-4 w-4" /> },
  { label: 'Experiments', path: '/experiments', icon: <FlaskConical className="h-4 w-4" /> },
  { label: 'Locales', path: '/locales', icon: <Globe className="h-4 w-4" /> },
  { label: 'SEO', path: '/seo', icon: <Search className="h-4 w-4" /> },
  {
    label: 'Settings', path: '/settings', icon: <Settings className="h-4 w-4" />,
    children: [
      { label: 'Users', path: '/settings/users', icon: <Users className="h-4 w-4" /> },
      { label: 'General', path: '/settings', icon: <Settings className="h-4 w-4" /> },
    ],
  },
]

function NavEntry({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path))
  const hasChildren = item.children && item.children.length > 0
  const isParentActive = hasChildren && item.children!.some(c => currentPath.startsWith(c.path))
  const [open, setOpen] = useState(isParentActive)

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors
            ${isParentActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
          `}
        >
          {item.icon}
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {open && (
          <div className="ml-3 pl-3 border-l space-y-0.5 mt-0.5">
            {item.children!.map(child => (
              <Link
                key={child.path}
                to={child.path}
                className={`flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md transition-colors
                  ${currentPath === child.path || (child.path !== '/settings' && currentPath.startsWith(child.path) && child.path !== '/components')
                    ? 'text-foreground bg-accent font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
              >
                {child.icon}
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      to={item.path}
      className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors
        ${isActive
          ? 'text-foreground bg-accent font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        }`}
    >
      {item.icon}
      {item.label}
    </Link>
  )
}

export function RootLayout() {
  const { user, clearAuth, refreshToken } = useAuthStore()
  const navigate = useNavigate()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

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

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV.map(item => (
            <NavEntry key={item.path + item.label} item={item} currentPath={currentPath} />
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
