export const listPageConfigsJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      pageId: { type: 'string', format: 'uuid' },
      campaignId: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  },
} as const

export const pageConfigIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
} as const

export const createPageConfigJsonSchema = {
  body: {
    type: 'object',
    required: ['pageId'],
    properties: {
      pageId: { type: 'string', format: 'uuid' },
      campaignId: { type: 'string', format: 'uuid' },
      priority: { type: 'integer', minimum: 0, default: 0 },
    },
    additionalProperties: false,
  },
} as const

export const updatePageConfigJsonSchema = {
  params: pageConfigIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      priority: { type: 'integer', minimum: 0 },
    },
    additionalProperties: false,
    minProperties: 1,
  },
} as const

export const createSlotConfigJsonSchema = {
  params: pageConfigIdParamSchema.params,
  body: {
    type: 'object',
    required: ['priority'],
    properties: {
      slotId: { type: 'string', format: 'uuid' },
      subSlotId: { type: 'string', format: 'uuid' },
      priority: { type: 'integer', minimum: 0, default: 0 },
      // Experience path
      experienceId: { type: 'string', format: 'uuid' },
      // Inline path
      componentInstanceId: { type: 'string', format: 'uuid' },
      contentObjectId: { type: 'string', format: 'uuid' },
      targetingRuleId: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  },
} as const

export const slotConfigIdParamSchema = {
  params: {
    type: 'object',
    required: ['id', 'slotConfigId'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      slotConfigId: { type: 'string', format: 'uuid' },
    },
  },
} as const

export const diffQuerySchema = {
  querystring: {
    type: 'object',
    required: ['from', 'to'],
    properties: {
      from: { type: 'string', format: 'uuid' },
      to: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  },
} as const
