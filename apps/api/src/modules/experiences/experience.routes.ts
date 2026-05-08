import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './experience.service.js'
import {
  listExperiencesJsonSchema,
  experienceIdParamSchema,
  createExperienceJsonSchema,
  updateExperienceJsonSchema,
  ruleAttachParamSchema,
} from './experience.schema.js'

const experienceRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('experience:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('experience:write')] }
  const del = { preHandler: [fastify.authenticate, fastify.requirePermission('experience:write')] }

  fastify.get('/', { ...read, schema: listExperiencesJsonSchema }, async (
    req: FastifyRequest<{ Querystring: Parameters<typeof svc.listExperiences>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listExperiences(req.user.org, req.query))
  })

  fastify.get('/:id', { ...read, schema: experienceIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getExperience(req.user.org, req.params.id) })
  })

  fastify.post('/', { ...write, schema: createExperienceJsonSchema }, async (
    req: FastifyRequest<{ Body: Parameters<typeof svc.createExperience>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createExperience(req.user.org, req.body) })
  })

  fastify.patch('/:id', { ...write, schema: updateExperienceJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: Parameters<typeof svc.updateExperience>[2] }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.updateExperience(req.user.org, req.params.id, req.body) })
  })

  fastify.delete('/:id', { ...del, schema: experienceIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteExperience(req.user.org, req.params.id)
    await reply.status(204).send()
  })

  fastify.post('/:id/targeting-rules/:ruleId', { ...write, schema: ruleAttachParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string; ruleId: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.attachTargetingRule(req.user.org, req.params.id, req.params.ruleId)
    await reply.status(204).send()
  })

  fastify.delete('/:id/targeting-rules/:ruleId', { ...del, schema: ruleAttachParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string; ruleId: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.detachTargetingRule(req.user.org, req.params.id, req.params.ruleId)
    await reply.status(204).send()
  })
}

export default experienceRoutes
