export interface VisitorContext {
  user?: {
    segments?: string[]
    tier?: string
    geo?: { country: string; region?: string }
    device?: 'desktop' | 'mobile' | 'tablet'
    language?: string
  }
  behavioral?: {
    sessionCount?: number
    daysSinceLastVisit?: number
    purchaseHistory?: string[]
  }
  contextual?: {
    timeOfDay?: number
    dayOfWeek?: number
    currentDate?: string
  }
  campaign?: {
    activeCampaigns?: string[]
  }
  urlParams?: Record<string, string>
  cookies?: Record<string, string>
  abBuckets?: Record<string, string>
}

export interface ResolvedSlot {
  slotId: string
  experienceId: string
  componentInstanceId: string
  contentObjectId: string
  componentSlug: string
  prefilledAttributes: Record<string, unknown>
  contentFields: Record<string, unknown>
  locale: string
}

export interface ResolvedPage {
  pageId: string
  slug: string
  locale: string
  metaTitle?: string
  metaDescription?: string
  ogTags?: Record<string, string>
  slots: ResolvedSlot[]
}
