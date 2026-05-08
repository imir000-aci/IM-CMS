export const listCampaignsJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      search: { type: 'string' },
      status: {
        type: 'string',
        enum: ['DRAFT', 'REVIEW', 'SCHEDULED', 'PREVIEW', 'PRODUCTION', 'ARCHIVED'],
      },
      isActive: { type: 'boolean', default: true },
    },
    additionalProperties: false,
  },
} as const

export const campaignIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
} as const

export const createCampaignJsonSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 300 },
      description: { type: 'string', maxLength: 2000 },
      priority: { type: 'integer', minimum: 0, default: 0 },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
    },
    additionalProperties: false,
  },
} as const

export const updateCampaignJsonSchema = {
  params: campaignIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 300 },
      description: { type: 'string', maxLength: 2000 },
      priority: { type: 'integer', minimum: 0 },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
    },
    additionalProperties: false,
    minProperties: 1,
  },
} as const

export const workflowTransitionJsonSchema = {
  params: campaignIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      comment: { type: 'string', maxLength: 2000 },
    },
    additionalProperties: false,
  },
} as const

export const approvalDecisionJsonSchema = {
  params: {
    type: 'object',
    required: ['id', 'stepId'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      stepId: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    required: ['decision'],
    properties: {
      decision: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
      comment: { type: 'string', maxLength: 2000 },
    },
    additionalProperties: false,
  },
} as const

export const addCommentJsonSchema = {
  params: campaignIdParamSchema.params,
  body: {
    type: 'object',
    required: ['body'],
    properties: {
      body: { type: 'string', minLength: 1, maxLength: 5000 },
      parentId: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  },
} as const

export const resolveCommentParamSchema = {
  params: {
    type: 'object',
    required: ['id', 'commentId'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      commentId: { type: 'string', format: 'uuid' },
    },
  },
} as const

export const attachChannelJsonSchema = {
  params: campaignIdParamSchema.params,
  body: {
    type: 'object',
    required: ['channelId'],
    properties: { channelId: { type: 'string', format: 'uuid' } },
    additionalProperties: false,
  },
} as const

export const attachPageJsonSchema = {
  params: campaignIdParamSchema.params,
  body: {
    type: 'object',
    required: ['pageId'],
    properties: { pageId: { type: 'string', format: 'uuid' } },
    additionalProperties: false,
  },
} as const

export const cloneCampaignJsonSchema = {
  params: campaignIdParamSchema.params,
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 300 },
    },
    additionalProperties: false,
  },
} as const
