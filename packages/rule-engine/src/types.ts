export type LogicalOperator = 'AND' | 'OR' | 'NOT'

export type ComparisonOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches_regex'
  | 'exists'
  | 'not_exists'
  | 'between'

export type ConditionType =
  | 'user_attribute'
  | 'behavioral'
  | 'contextual'
  | 'campaign_membership'
  | 'url_param'
  | 'cookie'
  | 'ab_bucket'

export interface LeafCondition {
  type: ConditionType
  attribute: string
  op: ComparisonOperator
  value?: unknown
}

export type ConditionTree =
  | { operator: 'AND' | 'OR'; children: ConditionTree[] }
  | { operator: 'NOT'; children: [ConditionTree] }
  | { leaf: LeafCondition }

export interface VisitorContext {
  user?: {
    segments?: string[]
    tier?: string
    country?: string
    region?: string
    device?: string
    language?: string
    [key: string]: unknown
  }
  behavioral?: {
    sessionCount?: number
    daysSinceLastVisit?: number
    purchaseHistory?: string[]
    [key: string]: unknown
  }
  contextual?: {
    timeOfDay?: number
    dayOfWeek?: number
    currentDate?: string
    [key: string]: unknown
  }
  campaign?: {
    activeCampaigns?: string[]
  }
  urlParams?: Record<string, string>
  cookies?: Record<string, string>
  abBuckets?: Record<string, string>
}

export interface EvaluationResult {
  matched: boolean
  reason?: string
}
