export const listPoolsJsonSchema = {
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

export const poolIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
} as const

export const createPoolJsonSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', maxLength: 1000 },
    },
    additionalProperties: false,
  },
} as const

export const updatePoolJsonSchema = {
  params: poolIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', maxLength: 1000 },
    },
    additionalProperties: false,
    minProperties: 1,
  },
} as const

export const addItemJsonSchema = {
  params: poolIdParamSchema.params,
  body: {
    type: 'object',
    required: ['componentInstanceId'],
    properties: {
      componentInstanceId: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  },
} as const

export const removeItemParamSchema = {
  params: {
    type: 'object',
    required: ['id', 'itemId'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      itemId: { type: 'string', format: 'uuid' },
    },
  },
} as const

export const reorderItemsJsonSchema = {
  params: poolIdParamSchema.params,
  body: {
    type: 'object',
    required: ['orderedItemIds'],
    properties: {
      orderedItemIds: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
    },
    additionalProperties: false,
  },
} as const
