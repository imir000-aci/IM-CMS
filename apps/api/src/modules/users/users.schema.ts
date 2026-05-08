export const listUsersJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      role: { type: 'string' },
      search: { type: 'string' },
      isActive: { type: 'boolean' },
    },
    additionalProperties: false,
  },
} as const

export const createUserJsonSchema = {
  body: {
    type: 'object',
    required: ['email', 'displayName', 'role'],
    properties: {
      email: { type: 'string', format: 'email' },
      displayName: { type: 'string', minLength: 1, maxLength: 200 },
      role: {
        type: 'string',
        enum: ['PLATFORM_ADMIN', 'CONTENT_AUTHOR', 'CAMPAIGN_MANAGER', 'DEVELOPER', 'APPROVER', 'ANALYST'],
      },
      password: { type: 'string', minLength: 8 },
    },
    additionalProperties: false,
  },
} as const

export const updateUserJsonSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
  body: {
    type: 'object',
    properties: {
      displayName: { type: 'string', minLength: 1, maxLength: 200 },
      role: {
        type: 'string',
        enum: ['PLATFORM_ADMIN', 'CONTENT_AUTHOR', 'CAMPAIGN_MANAGER', 'DEVELOPER', 'APPROVER', 'ANALYST'],
      },
      avatarUrl: { type: 'string', format: 'uri' },
    },
    additionalProperties: false,
    minProperties: 1,
  },
} as const

export const userIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
} as const
