export const listChannelsJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      search: { type: 'string' },
      isActive: { type: 'boolean', default: true },
    },
    additionalProperties: false,
  },
} as const

export const channelIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
} as const

export const createChannelJsonSchema = {
  body: {
    type: 'object',
    required: ['name', 'slug'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      slug: { type: 'string', pattern: '^[a-z0-9-]+$', maxLength: 100 },
      description: { type: 'string', maxLength: 1000 },
      defaultLocale: { type: 'string', minLength: 2, maxLength: 10 },
    },
    additionalProperties: false,
  },
} as const

export const updateChannelJsonSchema = {
  params: channelIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', maxLength: 1000 },
      defaultLocale: { type: 'string', minLength: 2, maxLength: 10 },
    },
    additionalProperties: false,
    minProperties: 1,
  },
} as const
