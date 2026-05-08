export type CampaignStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'SCHEDULED'
  | 'PREVIEW'
  | 'PRODUCTION'
  | 'ARCHIVED'

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED'

export type ExperienceScope = 'GLOBAL' | 'CAMPAIGN'

export interface Experience {
  id: string
  organizationId: string
  name: string
  scope: ExperienceScope
  componentInstanceId?: string
  contentObjectId?: string
  fallbackExperienceId?: string
  priority: number
  abTestKey?: string
  abVariantId?: string
  startDate?: Date
  endDate?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Campaign {
  id: string
  organizationId: string
  name: string
  description?: string
  status: CampaignStatus
  priority: number
  startDate?: Date
  endDate?: Date
  createdById: string
  clonedFromId?: string
  isArchived: boolean
  archivedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface ApprovalStep {
  id: string
  campaignId: string
  approverId: string
  stepOrder: number
  status: ApprovalStatus
  decidedAt?: Date
  comment?: string
}

export interface CollisionReport {
  id: string
  campaignId: string
  conflictsWith: string
  slotId?: string
  overlapStart: Date
  overlapEnd?: Date
  resolution?: 'PRIORITIZE' | 'EXCLUDE' | 'TIME_SHIFT' | 'OVERRIDE'
  resolvedAt?: Date
}
