import { describe, it, expect } from 'vitest'
import { evaluate } from './evaluator.js'
import type { ConditionTree, VisitorContext } from './types.js'

const baseCtx: VisitorContext = {
  user: { segments: ['premium'], tier: 'gold', country: 'US', device: 'desktop', language: 'en' },
  behavioral: { sessionCount: 5, daysSinceLastVisit: 2, purchaseHistory: ['electronics'] },
  contextual: { timeOfDay: 14, dayOfWeek: 2, currentDate: '2026-05-08' },
  campaign: { activeCampaigns: ['spring-sale'] },
  urlParams: { utm_source: 'email' },
  cookies: { theme: 'dark' },
  abBuckets: { 'hero-test': 'variant-b' },
}

describe('evaluate – leaf conditions', () => {
  it('eq: matches scalar value', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'tier', op: 'eq', value: 'gold' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('eq: fails when value differs', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'tier', op: 'eq', value: 'silver' } }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('eq: matches when array contains scalar expected value', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'segments', op: 'eq', value: 'premium' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('ne: fails when equal', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'tier', op: 'ne', value: 'gold' } }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('ne: passes when array does not include value', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'segments', op: 'ne', value: 'vip' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('gt: numeric greater-than', () => {
    const tree: ConditionTree = { leaf: { type: 'behavioral', attribute: 'session_count', op: 'gt', value: 3 } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('gt: fails when equal', () => {
    const tree: ConditionTree = { leaf: { type: 'behavioral', attribute: 'session_count', op: 'gt', value: 5 } }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('gte: passes when equal', () => {
    const tree: ConditionTree = { leaf: { type: 'behavioral', attribute: 'session_count', op: 'gte', value: 5 } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('lt: numeric less-than', () => {
    const tree: ConditionTree = { leaf: { type: 'contextual', attribute: 'time_of_day', op: 'lt', value: 18 } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('lte: passes when equal', () => {
    const tree: ConditionTree = { leaf: { type: 'contextual', attribute: 'time_of_day', op: 'lte', value: 14 } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('in: scalar in array', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'country', op: 'in', value: ['US', 'CA'] } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('in: scalar not in array', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'country', op: 'in', value: ['GB', 'DE'] } }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('in: array-actual intersects expected', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'segments', op: 'in', value: ['premium', 'vip'] } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('not_in: scalar not in array', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'country', op: 'not_in', value: ['GB', 'DE'] } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('not_in: scalar in array returns false', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'country', op: 'not_in', value: ['US', 'CA'] } }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('contains: string contains substring', () => {
    const tree: ConditionTree = { leaf: { type: 'url_param', attribute: 'utm_source', op: 'contains', value: 'email' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('contains: array contains item', () => {
    const tree: ConditionTree = { leaf: { type: 'behavioral', attribute: 'purchase_history', op: 'contains', value: 'electronics' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('starts_with: string matches prefix', () => {
    const tree: ConditionTree = { leaf: { type: 'url_param', attribute: 'utm_source', op: 'starts_with', value: 'em' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('starts_with: fails for non-prefix', () => {
    const tree: ConditionTree = { leaf: { type: 'url_param', attribute: 'utm_source', op: 'starts_with', value: 'mail' } }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('ends_with: string matches suffix', () => {
    const tree: ConditionTree = { leaf: { type: 'url_param', attribute: 'utm_source', op: 'ends_with', value: 'ail' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('matches_regex: valid regex matches', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'language', op: 'matches_regex', value: '^en' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('matches_regex: invalid regex returns false', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'language', op: 'matches_regex', value: '[invalid' } }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('between: value within range', () => {
    const tree: ConditionTree = { leaf: { type: 'contextual', attribute: 'time_of_day', op: 'between', value: [9, 17] } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('between: value at boundary included', () => {
    const tree: ConditionTree = { leaf: { type: 'contextual', attribute: 'time_of_day', op: 'between', value: [14, 20] } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('between: value outside range', () => {
    const tree: ConditionTree = { leaf: { type: 'contextual', attribute: 'time_of_day', op: 'between', value: [20, 23] } }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('exists: defined attribute returns true', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'tier', op: 'exists' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('not_exists: missing attribute returns true', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'postal_code', op: 'not_exists' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('ab_bucket: variant matches', () => {
    const tree: ConditionTree = { leaf: { type: 'ab_bucket', attribute: 'hero-test', op: 'eq', value: 'variant-b' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('cookie: value matches', () => {
    const tree: ConditionTree = { leaf: { type: 'cookie', attribute: 'theme', op: 'eq', value: 'dark' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('campaign_membership: active campaign in list', () => {
    const tree: ConditionTree = { leaf: { type: 'campaign_membership', attribute: 'activeCampaigns', op: 'contains', value: 'spring-sale' } }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })
})

describe('evaluate – logical operators', () => {
  const trueLeaf: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'tier', op: 'eq', value: 'gold' } }
  const falseLeaf: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'tier', op: 'eq', value: 'silver' } }

  it('AND: all true returns true', () => {
    const tree: ConditionTree = { operator: 'AND', children: [trueLeaf, trueLeaf] }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('AND: any false returns false', () => {
    const tree: ConditionTree = { operator: 'AND', children: [trueLeaf, falseLeaf] }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('AND: empty children returns false', () => {
    const tree: ConditionTree = { operator: 'AND', children: [] }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('OR: any true returns true', () => {
    const tree: ConditionTree = { operator: 'OR', children: [falseLeaf, trueLeaf] }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('OR: all false returns false', () => {
    const tree: ConditionTree = { operator: 'OR', children: [falseLeaf, falseLeaf] }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('OR: empty children returns false', () => {
    const tree: ConditionTree = { operator: 'OR', children: [] }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('NOT: inverts true to false', () => {
    const tree: ConditionTree = { operator: 'NOT', children: [trueLeaf] }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('NOT: inverts false to true', () => {
    const tree: ConditionTree = { operator: 'NOT', children: [falseLeaf] }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('nested: AND inside OR', () => {
    const andBlock: ConditionTree = {
      operator: 'AND',
      children: [
        { leaf: { type: 'user_attribute', attribute: 'country', op: 'eq', value: 'US' } },
        { leaf: { type: 'user_attribute', attribute: 'tier', op: 'eq', value: 'gold' } },
      ],
    }
    const tree: ConditionTree = { operator: 'OR', children: [falseLeaf, andBlock] }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('nested: NOT inside AND', () => {
    const tree: ConditionTree = {
      operator: 'AND',
      children: [
        trueLeaf,
        { operator: 'NOT', children: [falseLeaf] },
      ],
    }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })

  it('deeply nested: three levels', () => {
    const tree: ConditionTree = {
      operator: 'AND',
      children: [
        { operator: 'OR', children: [falseLeaf, trueLeaf] },
        { operator: 'NOT', children: [falseLeaf] },
      ],
    }
    expect(evaluate(tree, baseCtx)).toBe(true)
  })
})

describe('evaluate – edge cases', () => {
  it('empty context returns false for attribute eq check', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'tier', op: 'eq', value: 'gold' } }
    expect(evaluate(tree, {})).toBe(false)
  })

  it('null attribute value matches not_exists', () => {
    const ctx: VisitorContext = { user: { tier: undefined } }
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'tier', op: 'not_exists' } }
    expect(evaluate(tree, ctx)).toBe(true)
  })

  it('non-numeric gt returns false', () => {
    const ctx: VisitorContext = { user: { tier: 'gold' } }
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'tier', op: 'gt', value: 1 } }
    expect(evaluate(tree, ctx)).toBe(false)
  })

  it('in with non-array expected returns false', () => {
    const tree: ConditionTree = { leaf: { type: 'user_attribute', attribute: 'country', op: 'in', value: 'US' } }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })

  it('between with non-array range returns false', () => {
    const tree: ConditionTree = { leaf: { type: 'contextual', attribute: 'time_of_day', op: 'between', value: 'bad' } }
    expect(evaluate(tree, baseCtx)).toBe(false)
  })
})
