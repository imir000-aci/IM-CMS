import React from 'react'
import { Badge } from './ui/badge'

type CampaignStatus = 'DRAFT' | 'REVIEW' | 'SCHEDULED' | 'PREVIEW' | 'PRODUCTION' | 'ARCHIVED'

const STATUS_CONFIG: Record<CampaignStatus, { label: string; variant: 'default' | 'secondary' | 'warning' | 'info' | 'success' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  REVIEW: { label: 'In Review', variant: 'warning' },
  SCHEDULED: { label: 'Scheduled', variant: 'info' },
  PREVIEW: { label: 'Preview', variant: 'info' },
  PRODUCTION: { label: 'Live', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'outline' },
}

export function CampaignStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as CampaignStatus] ?? { label: status, variant: 'secondary' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'success' : 'secondary'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  )
}

export function TranslationStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'secondary' | 'warning' | 'info' | 'success' }> = {
    PENDING: { label: 'Pending', variant: 'secondary' },
    IN_PROGRESS: { label: 'In Progress', variant: 'warning' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    NEEDS_REVIEW: { label: 'Needs Review', variant: 'info' },
  }
  const c = config[status] ?? { label: status, variant: 'secondary' as const }
  return <Badge variant={c.variant}>{c.label}</Badge>
}
