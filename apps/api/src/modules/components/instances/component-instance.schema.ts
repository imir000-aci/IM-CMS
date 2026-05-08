export const listInstancesJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      search: { type: 'string' },
      masterComponentId: { type: 'string', format: 'uuid' },
      tags: { type: 'string' },
      poolId: { type: 'string', format: 'uuid' },
      isActive: { type: 'boolean', default: true },
    },
    additionalProperties: false,
  },
} as const

export const instanceIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
} as const

export const createInstanceJsonSchema = {
  body: {
    type: 'object',
    required: ['masterComponentId', 'name'],
    properties: {
      masterComponentId: { type: 'string', format: 'uuid' },
      name: { type: 'string', minLength: 1, maxLength: 200 },
      prefilledAttributes: { type: 'object' },
      tags: { type: 'array', items: { type: 'string' }, default: [] },
    },
    additionalProperties: false,
  },
} as const

export const updateInstanceJsonSchema = {
  params: instanceIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      prefilledAttributes: { type: 'object' },
      tags: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
    minProperties: 1,
  },
} as const
