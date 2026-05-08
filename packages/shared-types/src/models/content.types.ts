export type ContentObjectType =
  | 'TEXT'
  | 'RICH_TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'CTA'
  | 'HTML_SNIPPET'
  | 'DATA_FEED'

export type TranslationStatus = 'UNTRANSLATED' | 'IN_PROGRESS' | 'REVIEW' | 'APPROVED'

export interface ContentObject {
  id: string
  organizationId: string
  name: string
  type: ContentObjectType
  fields: Record<string, unknown>
  tags: string[]
  localeCode: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ContentObjectLocale {
  id: string
  contentObjectId: string
  localeCode: string
  fields: Record<string, unknown>
  status: TranslationStatus
  translatedAt?: Date
  reviewedAt?: Date
}

export interface ContentPool {
  id: string
  organizationId: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}
