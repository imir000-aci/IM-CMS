import { Outlet } from '@tanstack/react-router'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Outlet />
    </div>
  )
}
