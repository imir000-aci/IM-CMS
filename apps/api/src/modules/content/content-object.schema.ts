export const listContentJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      search: { type: 'string' },
      type: { type: 'string' },
      tags: { type: 'string' },
      isActive: { type: 'boolean', default: true },
    },
    additionalProperties: false,
  },
} as const

export const contentIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
} as const

export const createContentJsonSchema = {
  body: {
    type: 'object',
    required: ['name', 'type'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      type: { type: 'string', enum: ['TEXT', 'IMAGE', 'VIDEO', 'HTML', 'JSON', 'RICH_TEXT'] },
      fields: { type: 'object' },
      tags: { type: 'array', items: { type: 'string' }, default: [] },
    },
    additionalProperties: false,
  },
} as const

export const updateContentJsonSchema = {
  params: contentIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      fields: { type: 'object' },
      tags: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
    minProperties: 1,
  },
} as const

export const localeParamSchema = {
  params: {
    type: 'object',
    required: ['id', 'locale'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      locale: { type: 'string', minLength: 2, maxLength: 10 },
    },
  },
} as const

export const upsertLocaleJsonSchema = {
  params: localeParamSchema.params,
  body: {
    type: 'object',
    required: ['fields'],
    properties: {
      fields: { type: 'object' },
      translationStatus: {
        type: 'string',
        enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVIEW'],
      },
    },
    additionalProperties: false,
  },
} as const
