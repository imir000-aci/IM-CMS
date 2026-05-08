import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/rule-engine',
  'apps/api',
  'apps/delivery',
])
