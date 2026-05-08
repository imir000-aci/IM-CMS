import { apiClient } from './api-client'
import type { PaginatedResponse } from '@im-cms/shared-types'

// ─── Generic helpers ──────────────────────────────────────────────────────────

export function getData<T>(response: { data: { data: T } }): T {
  return response.data.data
}

export function getList<T>(response: { data: PaginatedResponse<T> }): PaginatedResponse<T> {
  return response.data
}

// ─── Master Components ────────────────────────────────────────────────────────

export const componentsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<MasterComponent>>('/components', { params }),
  get: (id: string) => apiClient.get<{ data: MasterComponent }>(`/components/${id}`),
  getCategories: () => apiClient.get<{ data: string[] }>('/components/categories'),
  create: (body: unknown) => apiClient.post<{ data: MasterComponent }>('/components', body),
  update: (id: string, body: unknown) => apiClient.put<{ data: MasterComponent }>(`/components/${id}`, body),
  delete: (id: string) => apiClient.delete(`/components/${id}`),
  deprecate: (id: string) => apiClient.post<{ data: MasterComponent }>(`/components/${id}/deprecate`),
  getVersions: (id: string) => apiClient.get<{ data: ComponentVersion[] }>(`/components/${id}/versions`),
  restoreVersion: (id: string, version: number) =>
    apiClient.post<{ data: MasterComponent }>(`/components/${id}/versions/${version}/restore`),
}

// ─── Component Instances ──────────────────────────────────────────────────────

export const instancesApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<ComponentInstance>>('/component-instances', { params }),
  get: (id: string) => apiClient.get<{ data: ComponentInstance }>(`/component-instances/${id}`),
  create: (body: unknown) => apiClient.post<{ data: ComponentInstance }>('/component-instances', body),
  update: (id: string, body: unknown) =>
    apiClient.patch<{ data: ComponentInstance }>(`/component-instances/${id}`, body),
  delete: (id: string) => apiClient.delete(`/component-instances/${id}`),
}

// ─── Content Objects ──────────────────────────────────────────────────────────

export const contentApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<ContentObject>>('/content', { params }),
  get: (id: string) => apiClient.get<{ data: ContentObject }>(`/content/${id}`),
  create: (body: unknown) => apiClient.post<{ data: ContentObject }>('/content', body),
  update: (id: string, body: unknown) => apiClient.patch<{ data: ContentObject }>(`/content/${id}`, body),
  delete: (id: string) => apiClient.delete(`/content/${id}`),
  getVersions: (id: string) => apiClient.get<{ data: ContentVersion[] }>(`/content/${id}/versions`),
  getLocale: (id: string, locale: string) =>
    apiClient.get<{ data: ContentLocale }>(`/content/${id}/locales/${locale}`),
  upsertLocale: (id: string, locale: string, body: unknown) =>
    apiClient.put<{ data: ContentLocale }>(`/content/${id}/locales/${locale}`, body),
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const campaignsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Campaign>>('/campaigns', { params }),
  get: (id: string) => apiClient.get<{ data: Campaign }>(`/campaigns/${id}`),
  create: (body: unknown) => apiClient.post<{ data: Campaign }>('/campaigns', body),
  update: (id: string, body: unknown) => apiClient.patch<{ data: Campaign }>(`/campaigns/${id}`, body),
  delete: (id: string) => apiClient.delete(`/campaigns/${id}`),
  clone: (id: string, name: string) => apiClient.post<{ data: Campaign }>(`/campaigns/${id}/clone`, { name }),
  submit: (id: string, comment?: string) =>
    apiClient.post<{ data: Campaign }>(`/campaigns/${id}/submit`, { comment }),
  schedule: (id: string, comment?: string) =>
    apiClient.post<{ data: Campaign }>(`/campaigns/${id}/schedule`, { comment }),
  preview: (id: string, comment?: string) =>
    apiClient.post<{ data: Campaign }>(`/campaigns/${id}/preview`, { comment }),
  publish: (id: string, comment?: string) =>
    apiClient.post<{ data: Campaign }>(`/campaigns/${id}/publish`, { comment }),
  archive: (id: string, comment?: string) =>
    apiClient.post<{ data: Campaign }>(`/campaigns/${id}/archive`, { comment }),
  revert: (id: string, comment?: string) =>
    apiClient.post<{ data: Campaign }>(`/campaigns/${id}/revert`, { comment }),
  getApprovals: (id: string) => apiClient.get<{ data: ApprovalStep[] }>(`/campaigns/${id}/approvals`),
  decide: (id: string, stepId: string, body: { decision: string; comment?: string }) =>
    apiClient.post<{ data: ApprovalStep }>(`/campaigns/${id}/approvals/${stepId}/decide`, body),
  getComments: (id: string) => apiClient.get<{ data: Comment[] }>(`/campaigns/${id}/comments`),
  addComment: (id: string, body: string, parentId?: string) =>
    apiClient.post<{ data: Comment }>(`/campaigns/${id}/comments`, { body, parentId }),
  resolveComment: (id: string, commentId: string) =>
    apiClient.post(`/campaigns/${id}/comments/${commentId}/resolve`),
  checkCollisions: (id: string) => apiClient.post<{ data: CollisionResult }>(`/campaigns/${id}/check-collisions`),
  getCollisions: (id: string) => apiClient.get<{ data: CollisionReport[] }>(`/campaigns/${id}/collisions`),
  attachChannel: (id: string, channelId: string) =>
    apiClient.post(`/campaigns/${id}/channels`, { channelId }),
  detachChannel: (id: string, channelId: string) =>
    apiClient.delete(`/campaigns/${id}/channels/${channelId}`),
  attachPage: (id: string, pageId: string) =>
    apiClient.post(`/campaigns/${id}/pages`, { pageId }),
  detachPage: (id: string, pageId: string) =>
    apiClient.delete(`/campaigns/${id}/pages/${pageId}`),
}

// ─── Targeting Rules ──────────────────────────────────────────────────────────

export const targetingApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<TargetingRule>>('/targeting-rules', { params }),
  get: (id: string) => apiClient.get<{ data: TargetingRule }>(`/targeting-rules/${id}`),
  create: (body: unknown) => apiClient.post<{ data: TargetingRule }>('/targeting-rules', body),
  update: (id: string, body: unknown) =>
    apiClient.patch<{ data: TargetingRule }>(`/targeting-rules/${id}`, body),
  delete: (id: string) => apiClient.delete(`/targeting-rules/${id}`),
  simulate: (id: string, context: unknown) =>
    apiClient.post<{ data: SimulateResult }>(`/targeting-rules/${id}/simulate`, { context }),
}

// ─── Experiences ──────────────────────────────────────────────────────────────

export const experiencesApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Experience>>('/experiences', { params }),
  get: (id: string) => apiClient.get<{ data: Experience }>(`/experiences/${id}`),
  create: (body: unknown) => apiClient.post<{ data: Experience }>('/experiences', body),
  update: (id: string, body: unknown) => apiClient.patch<{ data: Experience }>(`/experiences/${id}`, body),
  delete: (id: string) => apiClient.delete(`/experiences/${id}`),
  attachRule: (id: string, ruleId: string) =>
    apiClient.post(`/experiences/${id}/targeting-rules/${ruleId}`),
  detachRule: (id: string, ruleId: string) =>
    apiClient.delete(`/experiences/${id}/targeting-rules/${ruleId}`),
}

// ─── Channels ─────────────────────────────────────────────────────────────────

export const channelsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Channel>>('/channels', { params }),
  get: (id: string) => apiClient.get<{ data: Channel }>(`/channels/${id}`),
  create: (body: unknown) => apiClient.post<{ data: Channel }>('/channels', body),
  update: (id: string, body: unknown) => apiClient.patch<{ data: Channel }>(`/channels/${id}`, body),
  delete: (id: string) => apiClient.delete(`/channels/${id}`),
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export const pagesApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Page>>('/pages', { params }),
  get: (id: string) => apiClient.get<{ data: PageDetail }>(`/pages/${id}`),
  create: (body: unknown) => apiClient.post<{ data: Page }>('/pages', body),
  update: (id: string, body: unknown) => apiClient.patch<{ data: Page }>(`/pages/${id}`, body),
  delete: (id: string) => apiClient.delete(`/pages/${id}`),
  publish: (id: string) => apiClient.post<{ data: Page }>(`/pages/${id}/publish`),
  createZone: (pageId: string, body: unknown) =>
    apiClient.post<{ data: Zone }>(`/pages/${pageId}/zones`, body),
  deleteZone: (pageId: string, zoneId: string) =>
    apiClient.delete(`/pages/${pageId}/zones/${zoneId}`),
  createSlot: (pageId: string, zoneId: string, body: unknown) =>
    apiClient.post<{ data: Slot }>(`/pages/${pageId}/zones/${zoneId}/slots`, body),
  deleteSlot: (pageId: string, zoneId: string, slotId: string) =>
    apiClient.delete(`/pages/${pageId}/zones/${zoneId}/slots/${slotId}`),
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export const assetsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Asset>>('/assets', { params }),
  get: (id: string) => apiClient.get<{ data: Asset }>(`/assets/${id}`),
  requestUploadUrl: (body: unknown) =>
    apiClient.post<{ data: UploadUrlResponse }>('/assets/upload-url', body),
  confirm: (id: string, body?: unknown) =>
    apiClient.post<{ data: Asset }>(`/assets/${id}/confirm`, body),
  update: (id: string, body: unknown) => apiClient.patch<{ data: Asset }>(`/assets/${id}`, body),
  delete: (id: string) => apiClient.delete(`/assets/${id}`),
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<UserRecord>>('/users', { params }),
  get: (id: string) => apiClient.get<{ data: UserRecord }>(`/users/${id}`),
  create: (body: unknown) => apiClient.post<{ data: UserRecord }>('/users', body),
  update: (id: string, body: unknown) => apiClient.patch<{ data: UserRecord }>(`/users/${id}`, body),
  deactivate: (id: string) => apiClient.delete(`/users/${id}`),
}

// ─── SEO ──────────────────────────────────────────────────────────────────────

export const seoApi = {
  listRedirects: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<SeoRedirect>>('/seo/redirects', { params }),
  createRedirect: (body: unknown) => apiClient.post<{ data: SeoRedirect }>('/seo/redirects', body),
  updateRedirect: (id: string, body: unknown) =>
    apiClient.patch<{ data: SeoRedirect }>(`/seo/redirects/${id}`, body),
  deleteRedirect: (id: string) => apiClient.delete(`/seo/redirects/${id}`),
}

// ─── Locales ─────────────────────────────────────────────────────────────────

export const localesApi = {
  list: () => apiClient.get<{ data: Locale[] }>('/locales'),
  create: (body: unknown) => apiClient.post<{ data: Locale }>('/locales', body),
  update: (code: string, body: unknown) => apiClient.patch<{ data: Locale }>(`/locales/${code}`, body),
  delete: (code: string) => apiClient.delete(`/locales/${code}`),
}

// ─── Local type aliases (mirrors API shape, not importing Prisma) ─────────────

export interface MasterComponent {
  id: string; name: string; slug: string; description?: string; category?: string
  attributeSchema: AttributeDefinition[]; bentoConfig?: unknown
  currentVersion: number; isActive: boolean; isDeprecated: boolean
  createdAt: string; updatedAt: string
}
export interface AttributeDefinition {
  name: string; dataType: string; required: boolean; isAuthorFillable: boolean
  description?: string; defaultValue?: unknown
  validationRules?: { minLength?: number; maxLength?: number; regex?: string; allowedValues?: string[]; min?: number; max?: number }
}
export interface ComponentVersion { id: string; version: number; createdAt: string; createdBy?: { displayName: string } }
export interface ComponentInstance {
  id: string; name: string; masterComponentId: string
  prefilledAttributes: Record<string, unknown>; tags: string[]; isActive: boolean
  masterComponent?: { name: string; slug: string }; createdAt: string
}
export interface ContentObject {
  id: string; name: string; type: string; fields: Record<string, unknown>
  tags: string[]; isActive: boolean; currentVersion: number; createdAt: string; updatedAt: string
}
export interface ContentVersion { id: string; version: number; fields: Record<string, unknown>; createdAt: string; createdBy?: { displayName: string } }
export interface ContentLocale {
  id: string; locale: string; fields: Record<string, unknown>; translationStatus: string
}
export interface Campaign {
  id: string; name: string; description?: string; status: string; priority: number
  startDate?: string; endDate?: string; clonedFromId?: string; isActive: boolean
  createdAt: string; updatedAt: string
  _count?: { approvalSteps: number; comments: number; collisionReports: number }
  channels?: Array<{ channel: { id: string; name: string; slug: string } }>
  pages?: Array<{ page: { id: string; name: string; slug: string } }>
  approvalSteps?: ApprovalStep[]
  comments?: Comment[]
  collisionReports?: CollisionReport[]
}
export interface ApprovalStep {
  id: string; stepOrder: number; status: string; decidedAt?: string
  approver: { id: string; displayName: string; email?: string }
}
export interface Comment {
  id: string; body: string; isResolved: boolean; parentId?: string; createdAt: string
  author: { id: string; displayName: string }
  replies?: Comment[]
}
export interface CollisionReport {
  id: string; conflictsWith: string; slotId: string; resolution: string; createdAt: string
}
export interface CollisionResult { hasCollisions: boolean; collisionCount: number; conflictingCampaigns: string[] }
export interface TargetingRule {
  id: string; name: string; description?: string; scope: string
  conditionTree: unknown; priority: number; isActive: boolean; createdAt: string
}
export interface SimulateResult { ruleId: string; matched: boolean; context: unknown; error?: string }
export interface Experience {
  id: string; name: string; componentInstanceId: string; contentObjectId: string
  abTestKey?: string; priority: number; startDate?: string; endDate?: string; isActive: boolean
  componentInstance?: { name: string; masterComponent?: { name: string; slug: string } }
  contentObject?: { name: string; type: string }
  targetingRules?: Array<{ targetingRule: TargetingRule }>
}
export interface Channel {
  id: string; name: string; slug: string; description?: string; defaultLocale: string
  isActive: boolean; createdAt: string; _count?: { pages: number }
}
export interface Page {
  id: string; name: string; slug: string; channelId: string; metaTitle?: string
  metaDescription?: string; isPublished: boolean; isActive: boolean; publishedAt?: string
  channel?: { name: string; slug: string }; createdAt: string
}
export interface PageDetail extends Page {
  zones: Zone[]
}
export interface Zone { id: string; name: string; order: number; slots: Slot[] }
export interface Slot { id: string; name: string; order: number; subSlots: SubSlot[] }
export interface SubSlot { id: string; name: string; order: number }
export interface Asset {
  id: string; filename: string; mimeType: string; sizeBytes: number
  cdnUrl: string; altText?: string; title?: string; uploadStatus: string; isActive: boolean
  renditions: Array<{ id: string; name: string; width: number; height: number; format: string; cdnUrl: string }>
  createdAt: string
}
export interface UploadUrlResponse { assetId: string; uploadUrl: string; s3Key: string; cdnUrl: string }
export interface UserRecord {
  id: string; email: string; displayName: string; role: string; isActive: boolean; createdAt: string
}
export interface SeoRedirect {
  id: string; fromPath: string; toPath: string; statusCode: number; isActive: boolean; createdAt: string
}
export interface Locale { id: string; code: string; name: string; isDefault: boolean; isActive: boolean }
