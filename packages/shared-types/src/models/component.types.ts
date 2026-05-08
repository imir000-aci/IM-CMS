export type AttributeDataType =
  | 'text'
  | 'rich_text'
  | 'image'
  | 'video'
  | 'url'
  | 'boolean'
  | 'enum'
  | 'json'
  | 'reference'
  | 'date'
  | 'number'

export interface AttributeDefinition {
  name: string
  displayLabel: string
  dataType: AttributeDataType
  required: boolean
  defaultValue?: unknown
  isAuthorFillable: boolean
  validationRules?: {
    minLength?: number
    maxLength?: number
    regex?: string
    allowedValues?: string[]
  }
  visibilityCondition?: {
    fieldName: string
    operator: 'eq' | 'ne'
    value: unknown
  }
}

export interface BentoConfig {
  rows: number
  cols: number
  cells: Array<{
    row: number
    col: number
    rowSpan: number
    colSpan: number
    label?: string
  }>
}

export interface MasterComponent {
  id: string
  organizationId: string
  name: string
  slug: string
  description?: string
  category?: string
  thumbnailUrl?: string
  attributeSchema: AttributeDefinition[]
  bentoConfig?: BentoConfig
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ComponentInstance {
  id: string
  organizationId: string
  masterComponentId: string
  name: string
  prefilledAttributes: Record<string, unknown>
  tags: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ComponentPool {
  id: string
  organizationId: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}
