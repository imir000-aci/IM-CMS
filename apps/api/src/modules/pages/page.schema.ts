export const listPagesJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      search: { type: 'string' },
      channelId: { type: 'string', format: 'uuid' },
      templateId: { type: 'string', format: 'uuid' },
      isPublished: { type: 'boolean' },
      isActive: { type: 'boolean', default: true },
    },
    additionalProperties: false,
  },
} as const

export const pageIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
} as const

export const createPageJsonSchema = {
  body: {
    type: 'object',
    required: ['name', 'slug', 'channelId'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 300 },
      slug: { type: 'string', minLength: 1, maxLength: 200 },
      channelId: { type: 'string', format: 'uuid' },
      templateId: { type: 'string', format: 'uuid' },
      metaTitle: { type: 'string', maxLength: 200 },
      metaDescription: { type: 'string', maxLength: 500 },
      ogTags: { type: 'object' },
    },
    additionalProperties: false,
  },
} as const

export const updatePageJsonSchema = {
  params: pageIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 300 },
      slug: { type: 'string', minLength: 1, maxLength: 200 },
      metaTitle: { type: 'string', maxLength: 200 },
      metaDescription: { type: 'string', maxLength: 500 },
      ogTags: { type: 'object' },
    },
    additionalProperties: false,
    minProperties: 1,
  },
} as const

export const zoneIdParamSchema = {
  params: {
    type: 'object',
    required: ['id', 'zoneId'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      zoneId: { type: 'string', format: 'uuid' },
    },
  },
} as const

export const createZoneJsonSchema = {
  params: pageIdParamSchema.params,
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      order: { type: 'integer', minimum: 0, default: 0 },
      layoutConfig: { type: 'object' },
    },
    additionalProperties: false,
  },
} as const

export const slotIdParamSchema = {
  params: {
    type: 'object',
    required: ['id', 'zoneId', 'slotId'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      zoneId: { type: 'string', format: 'uuid' },
      slotId: { type: 'string', format: 'uuid' },
    },
  },
} as const

export const createSlotJsonSchema = {
  params: zoneIdParamSchema.params,
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      order: { type: 'integer', minimum: 0, default: 0 },
      allowedComponentTypes: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
  },
} as const

export const subSlotIdParamSchema = {
  params: {
    type: 'object',
    required: ['id', 'zoneId', 'slotId', 'subSlotId'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      zoneId: { type: 'string', format: 'uuid' },
      slotId: { type: 'string', format: 'uuid' },
      subSlotId: { type: 'string', format: 'uuid' },
    },
  },
} as const

export const createSubSlotJsonSchema = {
  params: slotIdParamSchema.params,
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      order: { type: 'integer', minimum: 0, default: 0 },
    },
    additionalProperties: false,
  },
} as const
