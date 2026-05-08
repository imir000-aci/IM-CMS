import type {
  ConditionTree,
  ConditionType,
  ComparisonOperator,
  LeafCondition,
  VisitorContext,
} from './types.js'

export function evaluate(tree: ConditionTree, ctx: VisitorContext): boolean {
  if ('leaf' in tree) {
    return evaluateLeaf(tree.leaf, ctx)
  }
  if (tree.operator === 'NOT') {
    return !evaluate(tree.children[0], ctx)
  }
  if (tree.operator === 'AND') {
    return tree.children.length > 0 && tree.children.every((child) => evaluate(child, ctx))
  }
  // OR
  return tree.children.some((child) => evaluate(child, ctx))
}

function evaluateLeaf(leaf: LeafCondition, ctx: VisitorContext): boolean {
  const value = resolveAttribute(leaf.type, leaf.attribute, ctx)
  return applyOperator(leaf.op, value, leaf.value)
}

function resolveAttribute(type: ConditionType, attribute: string, ctx: VisitorContext): unknown {
  switch (type) {
    case 'user_attribute': {
      if (attribute === 'segments') return ctx.user?.segments
      if (attribute === 'tier') return ctx.user?.tier
      if (attribute === 'country') return ctx.user?.country
      if (attribute === 'region') return ctx.user?.region
      if (attribute === 'device') return ctx.user?.device
      if (attribute === 'language') return ctx.user?.language
      return ctx.user?.[attribute]
    }
    case 'behavioral': {
      if (attribute === 'session_count') return ctx.behavioral?.sessionCount
      if (attribute === 'days_since_last_visit') return ctx.behavioral?.daysSinceLastVisit
      if (attribute === 'purchase_history') return ctx.behavioral?.purchaseHistory
      return ctx.behavioral?.[attribute]
    }
    case 'contextual': {
      if (attribute === 'time_of_day') return ctx.contextual?.timeOfDay
      if (attribute === 'day_of_week') return ctx.contextual?.dayOfWeek
      if (attribute === 'current_date') return ctx.contextual?.currentDate
      return ctx.contextual?.[attribute]
    }
    case 'campaign_membership': {
      return ctx.campaign?.activeCampaigns
    }
    case 'url_param': {
      return ctx.urlParams?.[attribute]
    }
    case 'cookie': {
      return ctx.cookies?.[attribute]
    }
    case 'ab_bucket': {
      return ctx.abBuckets?.[attribute]
    }
    default: {
      return undefined
    }
  }
}

function applyOperator(op: ComparisonOperator, actual: unknown, expected: unknown): boolean {
  switch (op) {
    case 'exists':
      return actual !== undefined && actual !== null
    case 'not_exists':
      return actual === undefined || actual === null
    case 'eq':
      if (Array.isArray(actual)) {
        return Array.isArray(expected)
          ? actual.length === expected.length &&
              actual.every((v, i) => v === (expected as unknown[])[i])
          : actual.includes(expected)
      }
      return actual === expected
    case 'ne':
      if (Array.isArray(actual)) {
        return !actual.includes(expected)
      }
      return actual !== expected
    case 'gt':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected
    case 'gte':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected
    case 'lt':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected
    case 'lte':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected
    case 'in': {
      const arr = expected as unknown[]
      if (!Array.isArray(arr)) return false
      if (Array.isArray(actual)) {
        return actual.some((v) => arr.includes(v))
      }
      return arr.includes(actual)
    }
    case 'not_in': {
      const arr = expected as unknown[]
      if (!Array.isArray(arr)) return true
      if (Array.isArray(actual)) {
        return !actual.some((v) => arr.includes(v))
      }
      return !arr.includes(actual)
    }
    case 'contains':
      if (typeof actual === 'string' && typeof expected === 'string') {
        return actual.includes(expected)
      }
      if (Array.isArray(actual)) {
        return actual.includes(expected)
      }
      return false
    case 'starts_with':
      return typeof actual === 'string' && typeof expected === 'string'
        ? actual.startsWith(expected)
        : false
    case 'ends_with':
      return typeof actual === 'string' && typeof expected === 'string'
        ? actual.endsWith(expected)
        : false
    case 'matches_regex':
      if (typeof actual !== 'string' || typeof expected !== 'string') return false
      try {
        return new RegExp(expected).test(actual)
      } catch {
        return false
      }
    case 'between': {
      if (typeof actual !== 'number') return false
      const range = expected as [number, number]
      if (!Array.isArray(range) || range.length !== 2) return false
      const [lo, hi] = range
      return typeof lo === 'number' && typeof hi === 'number' && actual >= lo && actual <= hi
    }
    default:
      return false
  }
}
