import React from 'react'
import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { RootLayout } from './layouts/RootLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { ComponentLibraryPage } from './pages/components/ComponentLibraryPage'
import { ComponentDetailPage } from './pages/components/ComponentDetailPage'
import { ContentListPage } from './pages/content/ContentListPage'
import { ContentDetailPage } from './pages/content/ContentDetailPage'
import { ChannelsPage } from './pages/channels/ChannelsPage'
import { PagesListPage } from './pages/pages/PagesListPage'
import { AssetLibraryPage } from './pages/dam/AssetLibraryPage'
import { TargetingRulesPage } from './pages/targeting/TargetingRulesPage'
import { ExperiencesPage } from './pages/experiences/ExperiencesPage'
import { CampaignListPage } from './pages/campaigns/CampaignListPage'
import { CampaignDetailPage } from './pages/campaigns/CampaignDetailPage'
import { LocalesPage } from './pages/locales/LocalesPage'
import { SeoPage } from './pages/seo/SeoPage'
import { UsersPage } from './pages/users/UsersPage'
import { useAuthStore } from './lib/auth-store'
import { PageBuilderStub } from './pages/pages/PageBuilderStub'

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

export const componentLibraryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/components',
  component: ComponentLibraryPage,
})

export const componentDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/components/$componentId',
  component: ComponentDetailPage,
})

export const contentRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/content',
  component: ContentListPage,
})

export const contentDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/content/$contentId',
  component: ContentDetailPage,
})

export const channelsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/channels',
  component: ChannelsPage,
})

export const pagesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/pages',
  component: PagesListPage,
})

export const pageBuilderRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/pages/$pageId',
  component: PageBuilderStub,
})

export const damRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dam',
  component: AssetLibraryPage,
})

export const targetingRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/targeting',
  component: TargetingRulesPage,
})

export const experiencesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/experiences',
  component: ExperiencesPage,
})

export const campaignsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/campaigns',
  component: CampaignListPage,
})

export const campaignDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/campaigns/$campaignId',
  component: CampaignDetailPage,
})

export const localesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/locales',
  component: LocalesPage,
})

export const seoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/seo',
  component: SeoPage,
})

export const usersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/settings/users',
  component: UsersPage,
})

export const orgSettingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/settings',
  component: () => (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
      <p className="text-muted-foreground mt-2">Organization settings coming soon.</p>
    </div>
  ),
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
