import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './page.service.js'
import {
  listPagesJsonSchema,
  pageIdParamSchema,
  createPageJsonSchema,
  updatePageJsonSchema,
  zoneIdParamSchema,
  createZoneJsonSchema,
  slotIdParamSchema,
  createSlotJsonSchema,
  subSlotIdParamSchema,
  createSubSlotJsonSchema,
} from './page.schema.js'

const pageRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('page:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('page:write')] }
  const del = { preHandler: [fastify.authenticate, fastify.requirePermission('page:delete')] }

  // Pages CRUD
  fastify.get('/', { ...read, schema: listPagesJsonSchema }, async (
    req: FastifyRequest<{ Querystring: Parameters<typeof svc.listPages>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listPages(req.user.org, req.query))
  })

  fastify.get('/:id', { ...read, schema: pageIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getPage(req.user.org, req.params.id) })
  })

  fastify.post('/', { ...write, schema: createPageJsonSchema }, async (
    req: FastifyRequest<{ Body: Parameters<typeof svc.createPage>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createPage(req.user.org, req.body) })
  })

  fastify.patch('/:id', { ...write, schema: updatePageJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: Parameters<typeof svc.updatePage>[2] }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.updatePage(req.user.org, req.params.id, req.body) })
  })

  fastify.delete('/:id', { ...del, schema: pageIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deletePage(req.user.org, req.params.id)
    await reply.status(204).send()
  })

  fastify.post('/:id/publish', { ...write, schema: pageIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.publishPage(req.user.org, req.params.id) })
  })

  // Zones
  fastify.post('/:id/zones', { ...write, schema: createZoneJsonSchema }, async (
    req: FastifyRequest<{
      Params: { id: string }
      Body: { name: string; order?: number; layoutConfig?: Record<string, unknown> }
    }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({
      data: await svc.createZone(req.user.org, req.params.id, req.body),
    })
  })

  fastify.patch('/:id/zones/:zoneId', { ...write, schema: zoneIdParamSchema }, async (
    req: FastifyRequest<{
      Params: { id: string; zoneId: string }
      Body: { name?: string; order?: number; layoutConfig?: Record<string, unknown> }
    }>,
    reply: FastifyReply,
  ) => {
    await reply.send({
      data: await svc.updateZone(req.user.org, req.params.id, req.params.zoneId, req.body),
    })
  })

  fastify.delete('/:id/zones/:zoneId', { ...del, schema: zoneIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string; zoneId: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteZone(req.user.org, req.params.id, req.params.zoneId)
    await reply.status(204).send()
  })

  // Slots
  fastify.post('/:id/zones/:zoneId/slots', { ...write, schema: createSlotJsonSchema }, async (
    req: FastifyRequest<{
      Params: { id: string; zoneId: string }
      Body: { name: string; order?: number; allowedComponentTypes?: string[] }
    }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({
      data: await svc.createSlot(req.user.org, req.params.id, req.params.zoneId, req.body),
    })
  })

  fastify.patch('/:id/zones/:zoneId/slots/:slotId', { ...write, schema: slotIdParamSchema }, async (
    req: FastifyRequest<{
      Params: { id: string; zoneId: string; slotId: string }
      Body: { name?: string; order?: number; allowedComponentTypes?: string[] }
    }>,
    reply: FastifyReply,
  ) => {
    await reply.send({
      data: await svc.updateSlot(req.user.org, req.params.id, req.params.zoneId, req.params.slotId, req.body),
    })
  })

  fastify.delete('/:id/zones/:zoneId/slots/:slotId', { ...del, schema: slotIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string; zoneId: string; slotId: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteSlot(req.user.org, req.params.id, req.params.zoneId, req.params.slotId)
    await reply.status(204).send()
  })

  // SubSlots
  fastify.post(
    '/:id/zones/:zoneId/slots/:slotId/sub-slots',
    { ...write, schema: createSubSlotJsonSchema },
    async (
      req: FastifyRequest<{
        Params: { id: string; zoneId: string; slotId: string }
        Body: { name: string; order?: number }
      }>,
      reply: FastifyReply,
    ) => {
      await reply.status(201).send({
        data: await svc.createSubSlot(
          req.user.org,
          req.params.id,
          req.params.zoneId,
          req.params.slotId,
          req.body,
        ),
      })
    },
  )

  fastify.delete(
    '/:id/zones/:zoneId/slots/:slotId/sub-slots/:subSlotId',
    { ...del, schema: subSlotIdParamSchema },
    async (
      req: FastifyRequest<{ Params: { id: string; zoneId: string; slotId: string; subSlotId: string } }>,
      reply: FastifyReply,
    ) => {
      await svc.deleteSubSlot(
        req.user.org,
        req.params.id,
        req.params.zoneId,
        req.params.slotId,
        req.params.subSlotId,
      )
      await reply.status(204).send()
    },
  )
}

export default pageRoutes
