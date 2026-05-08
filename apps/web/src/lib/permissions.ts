import type { Role, Permission } from '@im-cms/shared-types'

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  PLATFORM_ADMIN: [
    'component:read', 'component:write', 'component:delete',
    'content:read', 'content:write', 'content:delete',
    'campaign:read', 'campaign:write', 'campaign:approve', 'campaign:publish',
    'user:manage',
    'asset:read', 'asset:write',
    'targeting:read', 'targeting:write',
    'experience:read', 'experience:write',
    'analytics:read',
  ],
  DEVELOPER: [
    'component:read', 'component:write', 'component:delete',
    'content:read', 'content:write',
    'campaign:read',
    'asset:read', 'asset:write',
    'targeting:read', 'targeting:write',
    'experience:read', 'experience:write',
  ],
  CAMPAIGN_MANAGER: [
    'campaign:read', 'campaign:write', 'campaign:approve', 'campaign:publish',
    'content:read', 'content:write',
    'component:read',
    'asset:read', 'asset:write',
    'targeting:read', 'targeting:write',
    'experience:read', 'experience:write',
    'analytics:read',
  ],
  CONTENT_AUTHOR: [
    'content:read', 'content:write',
    'component:read',
    'campaign:read', 'campaign:write',
    'asset:read', 'asset:write',
    'experience:read',
  ],
  APPROVER: [
    'campaign:read', 'campaign:approve',
    'content:read',
    'component:read',
    'asset:read',
    'experience:read',
    'analytics:read',
  ],
  ANALYST: [
    'analytics:read',
    'campaign:read',
    'content:read',
    'component:read',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}
