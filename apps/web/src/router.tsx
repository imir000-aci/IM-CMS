import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { RootLayout } from './layouts/RootLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { useAuthStore } from './lib/auth-store'

// ─── Root route ───────────────────────────────────────────────────────────────
const rootRoute = createRootRoute()

// ─── Auth routes (unauthenticated shell) ─────────────────────────────────────
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth-layout',
  component: AuthLayout,
})

export const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/login',
  component: LoginPage,
})

// ─── App routes (authenticated shell) ────────────────────────────────────────
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app-layout',
  component: RootLayout,
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
})

export const indexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
})

export const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
})

// Placeholder routes — components implemented in later sprints
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-muted-foreground mt-2">This module is being built.</p>
    </div>
  )
}

export const componentLibraryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/components',
  component: () => <PlaceholderPage title="Component Library" />,
})

export const componentDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/components/$componentId',
  component: () => <PlaceholderPage title="Component Detail" />,
})

export const contentRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/content',
  component: () => <PlaceholderPage title="Content Pool" />,
})

export const contentDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/content/$contentId',
  component: () => <PlaceholderPage title="Content Object" />,
})

export const channelsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/channels',
  component: () => <PlaceholderPage title="Channels" />,
})

export const pagesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/pages',
  component: () => <PlaceholderPage title="Pages" />,
})

export const pageBuilderRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/pages/$pageId',
  component: () => <PlaceholderPage title="Page Builder" />,
})

export const damRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dam',
  component: () => <PlaceholderPage title="Asset Library" />,
})

export const targetingRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/targeting',
  component: () => <PlaceholderPage title="Targeting Rules" />,
})

export const experiencesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/experiences',
  component: () => <PlaceholderPage title="Experiences" />,
})

export const campaignsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/campaigns',
  component: () => <PlaceholderPage title="Campaigns" />,
})

export const campaignDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/campaigns/$campaignId',
  component: () => <PlaceholderPage title="Campaign Builder" />,
})

export const localesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/locales',
  component: () => <PlaceholderPage title="Localization" />,
})

export const seoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/seo',
  component: () => <PlaceholderPage title="SEO Manager" />,
})

export const usersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/settings/users',
  component: () => <PlaceholderPage title="Users" />,
})

export const orgSettingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/settings',
  component: () => <PlaceholderPage title="Settings" />,
})

// ─── Route tree ───────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  authLayoutRoute.addChildren([loginRoute]),
  appLayoutRoute.addChildren([
    indexRoute,
    dashboardRoute,
    componentLibraryRoute,
    componentDetailRoute,
    contentRoute,
    contentDetailRoute,
    channelsRoute,
    pagesRoute,
    pageBuilderRoute,
    damRoute,
    targetingRoute,
    experiencesRoute,
    campaignsRoute,
    campaignDetailRoute,
    localesRoute,
    seoRoute,
    usersRoute,
    orgSettingsRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
