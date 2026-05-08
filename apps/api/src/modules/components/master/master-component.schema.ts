export const listComponentsJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      search: { type: 'string' },
      category: { type: 'string' },
      isActive: { type: 'boolean', default: true },
    },
    additionalProperties: false,
  },
} as const

export const componentIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
} as const

export const versionParamSchema = {
  params: {
    type: 'object',
    required: ['id', 'version'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      version: { type: 'integer', minimum: 1 },
    },
  },
} as const

// Attribute definition shape for JSON Schema validation
export const ATTRIBUTE_DEFINITION_SCHEMA = {
  type: 'object',
  required: ['name', 'displayLabel', 'dataType', 'required', 'isAuthorFillable'],
  properties: {
    name: { type: 'string', minLength: 1, pattern: '^[a-zA-Z][a-zA-Z0-9_]*$' },
    displayLabel: { type: 'string', minLength: 1 },
    dataType: {
      type: 'string',
      enum: ['text', 'rich_text', 'image', 'video', 'url', 'boolean', 'enum', 'json', 'reference', 'date', 'number'],
    },
    required: { type: 'boolean' },
    isAuthorFillable: { type: 'boolean' },
    defaultValue: {},
    validationRules: {
      type: 'object',
      properties: {
        minLength: { type: 'number' },
        maxLength: { type: 'number' },
        regex: { type: 'string' },
        allowedValues: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
    visibilityCondition: {
      type: 'object',
      required: ['fieldName', 'operator', 'value'],
      properties: {
        fieldName: { type: 'string' },
        operator: { type: 'string', enum: ['eq', 'ne'] },
        value: {},
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const

export const createComponentJsonSchema = {
  body: {
    type: 'object',
    required: ['name', 'slug', 'attributeSchema'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      slug: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[a-z0-9-]+$' },
      description: { type: 'string', maxLength: 2000 },
      category: { type: 'string', maxLength: 100 },
      thumbnailUrl: { type: 'string', format: 'uri' },
      attributeSchema: { type: 'array', items: ATTRIBUTE_DEFINITION_SCHEMA },
      bentoConfig: {
        type: 'object',
        properties: {
          rows: { type: 'integer', minimum: 1, maximum: 6 },
          cols: { type: 'integer', minimum: 1, maximum: 6 },
          cells: { type: 'array' },
        },
      },
    },
    additionalProperties: false,
  },
} as const

export const updateComponentJsonSchema = {
  params: componentIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', maxLength: 2000 },
      category: { type: 'string', maxLength: 100 },
      thumbnailUrl: { type: 'string', format: 'uri' },
      attributeSchema: { type: 'array', items: ATTRIBUTE_DEFINITION_SCHEMA },
      bentoConfig: { type: 'object' },
      changelog: { type: 'string', maxLength: 500 },
    },
    additionalProperties: false,
    minProperties: 1,
  },
} as const
