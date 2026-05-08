import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './dam.service.js'
import {
  listAssetsJsonSchema,
  assetIdParamSchema,
  requestUploadUrlJsonSchema,
  confirmUploadJsonSchema,
  updateAssetJsonSchema,
} from './dam.schema.js'

const damRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('asset:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('asset:write')] }
  const del = { preHandler: [fastify.authenticate, fastify.requirePermission('asset:delete')] }

  fastify.get('/', { ...read, schema: listAssetsJsonSchema }, async (
    req: FastifyRequest<{ Querystring: Parameters<typeof svc.listAssets>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listAssets(req.user.org, req.query))
  })

  fastify.get('/:id', { ...read, schema: assetIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getAsset(req.user.org, req.params.id) })
  })

  fastify.post('/upload-url', { ...write, schema: requestUploadUrlJsonSchema }, async (
    req: FastifyRequest<{ Body: Parameters<typeof svc.requestUploadUrl>[2] }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({
      data: await svc.requestUploadUrl(req.user.org, req.user.sub, req.body),
    })
  })

  fastify.post('/:id/confirm', { ...write, schema: confirmUploadJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { altText?: string; title?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.confirmUpload(req.user.org, req.params.id, req.body) })
  })

  fastify.patch('/:id', { ...write, schema: updateAssetJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { altText?: string; title?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.updateAsset(req.user.org, req.params.id, req.body) })
  })

  fastify.delete('/:id', { ...del, schema: assetIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteAsset(req.user.org, req.params.id)
    await reply.status(204).send()
  })

  fastify.get('/:id/download-url', { ...read, schema: assetIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getAssetDownloadUrl(req.user.org, req.params.id) })
  })

  fastify.get('/:id/renditions', { ...read, schema: assetIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const asset = await svc.getAsset(req.user.org, req.params.id)
    await reply.send({ data: asset.renditions })
  })
}

export default damRoutes
