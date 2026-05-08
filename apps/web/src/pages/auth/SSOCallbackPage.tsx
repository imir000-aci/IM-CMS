import { useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useAuthStore } from '../../lib/auth-store'
import type { User } from '@im-cms/shared-types'

// The SSO callback receives tokens in the URL hash (implicit) or
// as query params after the server exchanges the SAML assertion / OAuth code.
// The server redirects to /auth/callback?accessToken=...&refreshToken=...
export function SSOCallbackPage() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as {
    accessToken?: string
    refreshToken?: string
    error?: string
  }
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    if (search.error) {
      void navigate({ to: '/login', search: { error: search.error } })
      return
    }

    if (search.accessToken && search.refreshToken) {
      // Decode user from JWT payload (no verification needed — server already verified)
      try {
        const payloadB64 = search.accessToken.split('.')[1]
        if (!payloadB64) throw new Error('Bad token')
        const payload = JSON.parse(atob(payloadB64)) as {
          sub: string
          email: string
          role: string
          org: string
        }

        const user: User = {
          id: payload.sub,
          organizationId: payload.org,
          email: payload.email,
          displayName: payload.email,
          role: payload.role as User['role'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        setAuth({ accessToken: search.accessToken, refreshToken: search.refreshToken, user })
        void navigate({ to: '/dashboard' })
      } catch {
        void navigate({ to: '/login' })
      }
      return
    }

    void navigate({ to: '/login' })
  }, [search, setAuth, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground mt-4">Completing sign-in…</p>
      </div>
    </div>
  )
}
