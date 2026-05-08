export type Role =
  | 'PLATFORM_ADMIN'
  | 'CONTENT_AUTHOR'
  | 'CAMPAIGN_MANAGER'
  | 'DEVELOPER'
  | 'APPROVER'
  | 'ANALYST'

export type Permission =
  | 'component:read'
  | 'component:write'
  | 'component:delete'
  | 'content:read'
  | 'content:write'
  | 'content:delete'
  | 'page:read'
  | 'page:write'
  | 'page:delete'
  | 'campaign:read'
  | 'campaign:write'
  | 'campaign:delete'
  | 'campaign:approve'
  | 'campaign:publish'
  | 'user:manage'
  | 'asset:read'
  | 'asset:write'
  | 'asset:delete'
  | 'targeting:read'
  | 'targeting:write'
  | 'experience:read'
  | 'experience:write'
  | 'analytics:read'

export interface User {
  id: string
  organizationId: string
  email: string
  displayName: string
  avatarUrl?: string
  role: Role
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Organization {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}
