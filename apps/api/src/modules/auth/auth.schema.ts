import { z } from 'zod'

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
})

export type LoginBody = z.infer<typeof loginBodySchema>
export type RefreshBody = z.infer<typeof refreshBodySchema>

export const loginJsonSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
    },
    additionalProperties: false,
  },
} as const

export const refreshJsonSchema = {
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
} as const
