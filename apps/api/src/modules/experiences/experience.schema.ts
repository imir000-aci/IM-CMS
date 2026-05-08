export const listExperiencesJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      search: { type: 'string' },
      campaignId: { type: 'string', format: 'uuid' },
      isActive: { type: 'boolean', default: true },
    },
    additionalProperties: false,
  },
} as const

export const experienceIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
} as const

export const createExperienceJsonSchema = {
  body: {
    type: 'object',
    required: ['name', 'componentInstanceId', 'contentObjectId'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      componentInstanceId: { type: 'string', format: 'uuid' },
      contentObjectId: { type: 'string', format: 'uuid' },
      abTestKey: { type: 'string', maxLength: 200 },
      priority: { type: 'integer', minimum: 0, default: 0 },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
    },
    additionalProperties: false,
  },
} as const

export const updateExperienceJsonSchema = {
  params: experienceIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      componentInstanceId: { type: 'string', format: 'uuid' },
      contentObjectId: { type: 'string', format: 'uuid' },
      abTestKey: { type: 'string', maxLength: 200 },
      priority: { type: 'integer', minimum: 0 },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
      isActive: { type: 'boolean' },
    },
    additionalProperties: false,
    minProperties: 1,
  },
} as const

export const ruleAttachParamSchema = {
  params: {
    type: 'object',
    required: ['id', 'ruleId'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      ruleId: { type: 'string', format: 'uuid' },
    },
  },
} as const
