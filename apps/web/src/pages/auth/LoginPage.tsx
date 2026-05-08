import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../../lib/auth-store'
import { apiClient } from '../../lib/api-client'
import type { User } from '@im-cms/shared-types'

interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password })
      setAuth(data)
      void navigate({ to: '/dashboard' })
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Login failed. Please check your credentials.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-card rounded-xl border shadow-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">IM-CMS</h1>
          <p className="text-sm text-muted-foreground mt-1">Campaign Management System</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Or sign in with SSO configured by your organization
          </p>
          <button
            type="button"
            className="mt-2 text-sm text-primary hover:underline"
            onClick={() => { window.location.href = '/api/v1/auth/saml/init' }}
          >
            Sign in with SSO
          </button>
        </div>
      </div>
    </div>
  )
}
