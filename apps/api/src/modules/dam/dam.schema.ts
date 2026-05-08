export const listAssetsJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      search: { type: 'string' },
      mimeType: { type: 'string' },
      isActive: { type: 'boolean', default: true },
    },
    additionalProperties: false,
  },
} as const

export const assetIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
} as const

export const requestUploadUrlJsonSchema = {
  body: {
    type: 'object',
    required: ['filename', 'mimeType', 'sizeBytes'],
    properties: {
      filename: { type: 'string', minLength: 1, maxLength: 500 },
      mimeType: { type: 'string', minLength: 3, maxLength: 100 },
      sizeBytes: { type: 'integer', minimum: 1, maximum: 524288000 }, // 500 MB max
      altText: { type: 'string', maxLength: 500 },
      title: { type: 'string', maxLength: 300 },
    },
    additionalProperties: false,
  },
} as const

export const confirmUploadJsonSchema = {
  params: assetIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      altText: { type: 'string', maxLength: 500 },
      title: { type: 'string', maxLength: 300 },
    },
    additionalProperties: false,
  },
} as const

export const updateAssetJsonSchema = {
  params: assetIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      altText: { type: 'string', maxLength: 500 },
      title: { type: 'string', maxLength: 300 },
    },
    additionalProperties: false,
    minProperties: 1,
  },
} as const
