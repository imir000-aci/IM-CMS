import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { useAuthStore } from '../../lib/auth-store'
import type { Campaign } from '@im-cms/shared-types'

interface CampaignListResponse {
  data: Campaign[]
  meta: { total: number }
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  REVIEW: 'bg-yellow-100 text-yellow-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  PREVIEW: 'bg-orange-100 text-orange-800',
  PRODUCTION: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-600',
}

function useCampaigns(status?: string) {
  return useQuery({
    queryKey: ['campaigns', { status }],
    queryFn: async () => {
      const params = status ? `?status=${status}` : ''
      const { data } = await apiClient.get<CampaignListResponse>(`/campaigns${params}`)
      return data
    },
  })
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: activeCampaigns, isLoading } = useCampaigns('PRODUCTION')
  const { data: upcomingCampaigns } = useCampaigns('SCHEDULED')
  const { data: reviewCampaigns } = useCampaigns('REVIEW')

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, {user?.displayName ?? 'there'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening across your campaigns today.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Live Campaigns" value={activeCampaigns?.meta.total ?? 0} color="green" loading={isLoading} />
        <StatCard label="Upcoming" value={upcomingCampaigns?.meta.total ?? 0} color="blue" loading={false} />
        <StatCard label="Pending Review" value={reviewCampaigns?.meta.total ?? 0} color="yellow" loading={false} />
        <StatCard label="Action Required" value={0} color="red" loading={false} />
      </div>

      {/* Active campaigns */}
      <section>
        <h2 className="text-lg font-medium mb-4">Live Campaigns</h2>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading...</div>
        ) : activeCampaigns?.data.length ? (
          <CampaignTable campaigns={activeCampaigns.data} />
        ) : (
          <EmptyState message="No campaigns currently live." />
        )}
      </section>

      {/* Pending review */}
      {(reviewCampaigns?.meta.total ?? 0) > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-4">Pending Your Review</h2>
          <CampaignTable campaigns={reviewCampaigns?.data ?? []} />
        </section>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  loading,
}: {
  label: string
  value: number
  color: 'green' | 'blue' | 'yellow' | 'red'
  loading: boolean
}) {
  const colorClasses = {
    green: 'border-green-200 bg-green-50 text-green-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-3xl font-bold">{loading ? '—' : value}</div>
      <div className="text-sm mt-1 opacity-80">{label}</div>
    </div>
  )
}

function CampaignTable({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Name</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Start</th>
            <th className="text-left px-4 py-3 font-medium">End</th>
            <th className="text-left px-4 py-3 font-medium">Priority</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] ?? ''}`}>
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{c.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      {message}
    </div>
  )
}
