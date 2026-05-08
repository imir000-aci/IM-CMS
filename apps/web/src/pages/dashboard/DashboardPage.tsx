import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Calendar, AlertCircle, Zap, Clock } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { CampaignStatusBadge } from '../../components/StatusBadge'
import { campaignsApi, type Campaign } from '../../lib/api'
import { useAuthStore } from '../../lib/auth-store'

function StatCard({ label, value, icon, color, loading }: {
  label: string; value: number; icon: React.ReactNode
  color: 'green' | 'blue' | 'yellow' | 'red'; loading: boolean
}) {
  const colorMap = {
    green: 'border-green-200 bg-green-50 text-green-700 dark:bg-green-950/20 dark:border-green-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:border-yellow-900',
    red: 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-900',
  }
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold">{loading ? '—' : value}</div>
          <div className="text-sm mt-1 opacity-80">{label}</div>
        </div>
        <div className="opacity-60">{icon}</div>
      </div>
    </div>
  )
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate()
  return (
    <tr
      className="hover:bg-muted/20 transition-colors cursor-pointer"
      onClick={() => void navigate({ to: '/campaigns/$campaignId', params: { campaignId: campaign.id } })}
    >
      <td className="px-4 py-3">
        <p className="font-medium text-sm">{campaign.name}</p>
        {campaign.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{campaign.description}</p>}
      </td>
      <td className="px-4 py-3">
        <CampaignStatusBadge status={campaign.status} />
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{campaign.priority}</td>
    </tr>
  )
}

function CampaignTable({ campaigns, emptyMessage }: { campaigns: Campaign[]; emptyMessage: string }) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Campaign</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Start</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">End</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Priority</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {campaigns.map(c => <CampaignRow key={c.id} campaign={c} />)}
        </tbody>
      </table>
    </div>
  )
}

function useCampaignsByStatus(status: string) {
  return useQuery({
    queryKey: ['campaigns', { status, pageSize: 10 }],
    queryFn: () => campaignsApi.list({ status, pageSize: 10 }),
  })
}

export function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()

  const { data: liveData, isLoading: liveLoading } = useCampaignsByStatus('PRODUCTION')
  const { data: scheduledData } = useCampaignsByStatus('SCHEDULED')
  const { data: reviewData } = useCampaignsByStatus('REVIEW')
  const { data: draftData } = useCampaignsByStatus('DRAFT')

  const liveCampaigns = (liveData?.data as unknown as { items?: Campaign[] })?.items ?? []
  const scheduledCampaigns = (scheduledData?.data as unknown as { items?: Campaign[] })?.items ?? []
  const reviewCampaigns = (reviewData?.data as unknown as { items?: Campaign[] })?.items ?? []

  const liveCount = (liveData?.data as unknown as { total?: number })?.total ?? 0
  const scheduledCount = (scheduledData?.data as unknown as { total?: number })?.total ?? 0
  const reviewCount = (reviewData?.data as unknown as { total?: number })?.total ?? 0
  const draftCount = (draftData?.data as unknown as { total?: number })?.total ?? 0

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back, {user?.displayName ?? 'there'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button onClick={() => void navigate({ to: '/campaigns' })}>
          View All Campaigns
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Live" value={liveCount} icon={<Zap className="h-5 w-5" />} color="green" loading={liveLoading} />
        <StatCard label="Scheduled" value={scheduledCount} icon={<Calendar className="h-5 w-5" />} color="blue" loading={false} />
        <StatCard label="In Review" value={reviewCount} icon={<AlertCircle className="h-5 w-5" />} color="yellow" loading={false} />
        <StatCard label="Drafts" value={draftCount} icon={<Clock className="h-5 w-5" />} color="red" loading={false} />
      </div>

      {/* Action required */}
      {reviewCount > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Awaiting Review ({reviewCount})
            </h2>
            <Button size="sm" variant="outline" onClick={() => void navigate({ to: '/campaigns' })}>
              View all
            </Button>
          </div>
          <CampaignTable campaigns={reviewCampaigns} emptyMessage="No campaigns in review." />
        </section>
      )}

      {/* Live campaigns */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-500" />
            Live Campaigns
          </h2>
        </div>
        <CampaignTable campaigns={liveCampaigns} emptyMessage="No campaigns currently live." />
      </section>

      {/* Upcoming */}
      {scheduledCount > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Upcoming ({scheduledCount})
            </h2>
          </div>
          <CampaignTable campaigns={scheduledCampaigns} emptyMessage="No scheduled campaigns." />
        </section>
      )}
    </div>
  )
}
