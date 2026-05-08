const CONDITION_TREE_SCHEMA = {
  type: 'object',
  oneOf: [
    {
      required: ['operator', 'children'],
      properties: {
        operator: { type: 'string', enum: ['AND', 'OR'] },
        children: { type: 'array', minItems: 1 },
      },
    },
    {
      required: ['operator', 'children'],
      properties: {
        operator: { type: 'string', enum: ['NOT'] },
        children: { type: 'array', minItems: 1, maxItems: 1 },
      },
    },
    {
      required: ['leaf'],
      properties: {
        leaf: {
          type: 'object',
          required: ['type', 'attribute', 'operator'],
          properties: {
            type: {
              type: 'string',
              enum: ['user_attribute', 'behavioral', 'contextual', 'campaign_membership', 'url_param', 'cookie', 'ab_bucket'],
            },
            attribute: { type: 'string' },
            operator: {
              type: 'string',
              enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains', 'starts_with', 'ends_with', 'in', 'not_in', 'between', 'matches_regex'],
            },
            value: {},
          },
          additionalProperties: false,
        },
      },
    },
  ],
} as const

export const listTargetingRulesJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      search: { type: 'string' },
      scope: { type: 'string', enum: ['GLOBAL', 'CAMPAIGN', 'EXPERIENCE'] },
      isActive: { type: 'boolean', default: true },
    },
    additionalProperties: false,
  },
} as const

export const targetingRuleIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
} as const

export const createTargetingRuleJsonSchema = {
  body: {
    type: 'object',
    required: ['name', 'conditionTree'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', maxLength: 1000 },
      scope: { type: 'string', enum: ['GLOBAL', 'CAMPAIGN', 'EXPERIENCE'], default: 'GLOBAL' },
      conditionTree: CONDITION_TREE_SCHEMA,
      priority: { type: 'integer', minimum: 0, default: 0 },
    },
    additionalProperties: false,
  },
} as const

export const updateTargetingRuleJsonSchema = {
  params: targetingRuleIdParamSchema.params,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', maxLength: 1000 },
      conditionTree: CONDITION_TREE_SCHEMA,
      priority: { type: 'integer', minimum: 0 },
      isActive: { type: 'boolean' },
    },
    additionalProperties: false,
    minProperties: 1,
  },
} as const

export const simulateTargetingRuleJsonSchema = {
  params: targetingRuleIdParamSchema.params,
  body: {
    type: 'object',
    required: ['context'],
    properties: {
      context: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          sessionId: { type: 'string' },
          attributes: { type: 'object' },
          behaviors: { type: 'object' },
          contextual: { type: 'object' },
          campaignIds: { type: 'array', items: { type: 'string' } },
          urlParams: { type: 'object' },
          cookies: { type: 'object' },
          abBuckets: { type: 'object' },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  },
} as const
