import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import * as svc from './campaign.service.js'
import {
  listCampaignsJsonSchema,
  campaignIdParamSchema,
  createCampaignJsonSchema,
  updateCampaignJsonSchema,
  workflowTransitionJsonSchema,
  approvalDecisionJsonSchema,
  addCommentJsonSchema,
  resolveCommentParamSchema,
  attachChannelJsonSchema,
  attachPageJsonSchema,
  cloneCampaignJsonSchema,
} from './campaign.schema.js'

const campaignRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('campaign:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('campaign:write')] }
  const del = { preHandler: [fastify.authenticate, fastify.requirePermission('campaign:delete')] }
  const approve = { preHandler: [fastify.authenticate, fastify.requirePermission('campaign:approve')] }

  // CRUD
  fastify.get('/', { ...read, schema: listCampaignsJsonSchema }, async (
    req: FastifyRequest<{ Querystring: Parameters<typeof svc.listCampaigns>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.send(await svc.listCampaigns(req.user.org, req.query))
  })

  fastify.get('/:id', { ...read, schema: campaignIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getCampaign(req.user.org, req.params.id) })
  })

  fastify.post('/', { ...write, schema: createCampaignJsonSchema }, async (
    req: FastifyRequest<{ Body: Parameters<typeof svc.createCampaign>[1] }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({ data: await svc.createCampaign(req.user.org, req.body) })
  })

  fastify.patch('/:id', { ...write, schema: updateCampaignJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: Parameters<typeof svc.updateCampaign>[2] }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.updateCampaign(req.user.org, req.params.id, req.body) })
  })

  fastify.delete('/:id', { ...del, schema: campaignIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.deleteCampaign(req.user.org, req.params.id)
    await reply.status(204).send()
  })

  fastify.post('/:id/clone', { ...write, schema: cloneCampaignJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { name: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({
      data: await svc.cloneCampaign(req.user.org, req.params.id, req.body.name),
    })
  })

  // Workflow transitions
  fastify.post('/:id/submit', { ...write, schema: workflowTransitionJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { comment?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({
      data: await svc.submitForReview(req.user.org, req.params.id, req.user.sub, req.user.role, req.body.comment),
    })
  })

  fastify.post('/:id/schedule', { ...write, schema: workflowTransitionJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { comment?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({
      data: await svc.scheduleForLaunch(req.user.org, req.params.id, req.user.sub, req.user.role, req.body.comment),
    })
  })

  fastify.post('/:id/preview', { ...write, schema: workflowTransitionJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { comment?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({
      data: await svc.sendToPreview(req.user.org, req.params.id, req.user.sub, req.user.role, req.body.comment),
    })
  })

  fastify.post('/:id/publish', { ...approve, schema: workflowTransitionJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { comment?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({
      data: await svc.publishCampaign(req.user.org, req.params.id, req.user.sub, req.user.role, req.body.comment),
    })
  })

  fastify.post('/:id/archive', { ...write, schema: workflowTransitionJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { comment?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({
      data: await svc.archiveCampaign(req.user.org, req.params.id, req.user.sub, req.user.role, req.body.comment),
    })
  })

  fastify.post('/:id/revert', { ...write, schema: workflowTransitionJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { comment?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({
      data: await svc.revertToDraft(req.user.org, req.params.id, req.user.sub, req.user.role, req.body.comment),
    })
  })

  fastify.post('/:id/relaunch', { ...write, schema: cloneCampaignJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { name: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({
      data: await svc.relaunchCampaign(req.user.org, req.params.id, req.body.name, req.user.sub),
    })
  })

  // Approvals
  fastify.get('/:id/approvals', { ...read, schema: campaignIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getApprovalSteps(req.user.org, req.params.id) })
  })

  fastify.post('/:id/approvals/:stepId/decide', { ...approve, schema: approvalDecisionJsonSchema }, async (
    req: FastifyRequest<{
      Params: { id: string; stepId: string }
      Body: { decision: 'APPROVED' | 'REJECTED'; comment?: string }
    }>,
    reply: FastifyReply,
  ) => {
    await reply.send({
      data: await svc.makeApprovalDecision(
        req.user.org,
        req.params.id,
        req.params.stepId,
        req.user.sub,
        req.body.decision,
        req.body.comment,
      ),
    })
  })

  // Comments
  fastify.get('/:id/comments', { ...read, schema: campaignIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getComments(req.user.org, req.params.id) })
  })

  fastify.post('/:id/comments', { ...write, schema: addCommentJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { body: string; parentId?: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.status(201).send({
      data: await svc.addComment(req.user.org, req.params.id, req.user.sub, req.body.body, req.body.parentId),
    })
  })

  fastify.post('/:id/comments/:commentId/resolve', { ...write, schema: resolveCommentParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string; commentId: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.resolveComment(req.user.org, req.params.id, req.params.commentId) })
  })

  // Collision detection
  fastify.post('/:id/check-collisions', { ...write, schema: campaignIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.runCollisionCheck(req.user.org, req.params.id) })
  })

  fastify.get('/:id/collisions', { ...read, schema: campaignIdParamSchema }, async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await reply.send({ data: await svc.getCollisionReports(req.user.org, req.params.id) })
  })

  // Channel/Page associations
  fastify.post('/:id/channels', { ...write, schema: attachChannelJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { channelId: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.attachChannel(req.user.org, req.params.id, req.body.channelId)
    await reply.status(204).send()
  })

  fastify.delete('/:id/channels/:channelId', { ...del }, async (
    req: FastifyRequest<{ Params: { id: string; channelId: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.detachChannel(req.user.org, req.params.id, req.params.channelId)
    await reply.status(204).send()
  })

  fastify.post('/:id/pages', { ...write, schema: attachPageJsonSchema }, async (
    req: FastifyRequest<{ Params: { id: string }; Body: { pageId: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.attachPage(req.user.org, req.params.id, req.body.pageId)
    await reply.status(204).send()
  })

  fastify.delete('/:id/pages/:pageId', { ...del }, async (
    req: FastifyRequest<{ Params: { id: string; pageId: string } }>,
    reply: FastifyReply,
  ) => {
    await svc.detachPage(req.user.org, req.params.id, req.params.pageId)
    await reply.status(204).send()
  })
}

export default campaignRoutes
