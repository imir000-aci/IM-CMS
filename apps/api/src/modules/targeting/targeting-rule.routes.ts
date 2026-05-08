import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './targeting-rule.service.js'
import {
  listTargetingRulesJsonSchema,
  targetingRuleIdParamSchema,
  createTargetingRuleJsonSchema,
  updateTargetingRuleJsonSchema,
  simulateTargetingRuleJsonSchema,
} from './targeting-rule.schema.js'
import type { VisitorContext } from '@im-cms/shared-types'

const targetingRuleRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('targeting:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('targeting:write')] }
  const del = { preHandler: [fastify.authenticate, fastify.requirePermission('targeting:write')] }

  fastify.get('/', { ...read, schema: listTargetingRulesJsonSchema }, async (
    req: FastifyRequest<{ Querystring: Parameters<typeof svc.listTargetingRules>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listTargetingRules(req.user.org, req.query))
  })

  fastify.get('/:id', { ...read, schema: targetingRuleIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getTargetingRule(req.user.org, req.params.id) })
  })

  fastify.post('/', { ...write, schema: createTargetingRuleJsonSchema }, async (
    req: FastifyRequest<{ Body: Parameters<typeof svc.createTargetingRule>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createTargetingRule(req.user.org, req.body) })
  })

  fastify.patch('/:id', { ...write, schema: updateTargetingRuleJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: Parameters<typeof svc.updateTargetingRule>[2] }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.updateTargetingRule(req.user.org, req.params.id, req.body) })
  })

  fastify.delete('/:id', { ...del, schema: targetingRuleIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteTargetingRule(req.user.org, req.params.id)
    await reply.status(204).send()
  })

  fastify.post('/:id/simulate', { ...read, schema: simulateTargetingRuleJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { context: VisitorContext } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.simulateTargetingRule(req.user.org, req.params.id, req.body.context) })
  })
}

export default targetingRuleRoutes
