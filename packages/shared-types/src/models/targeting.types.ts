export type RuleScope = 'GLOBAL' | 'CAMPAIGN' | 'PAGE'

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
  value: unknown
}

export type ConditionTree =
  | { operator: 'AND' | 'OR'; children: ConditionTree[] }
  | { operator: 'NOT'; children: [ConditionTree] }
  | { leaf: LeafCondition }

export interface TargetingRule {
  id: string
  organizationId: string
  name: string
  description?: string
  scope: RuleScope
  conditionTree: ConditionTree
  priority: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
