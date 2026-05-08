import type { FastifyPluginAsync } from 'fastify'
import * as ctrl from './master-component.controller.js'
import {
  listComponentsJsonSchema,
  componentIdParamSchema,
  versionParamSchema,
  createComponentJsonSchema,
  updateComponentJsonSchema,
} from './master-component.schema.js'

const masterComponentRoutes: FastifyPluginAsync = async (fastify) => {
  const read = { preHandler: [fastify.authenticate, fastify.requirePermission('component:read')] }
  const write = { preHandler: [fastify.authenticate, fastify.requirePermission('component:write')] }
  const del = { preHandler: [fastify.authenticate, fastify.requirePermission('component:delete')] }

  fastify.get('/', { ...read, schema: listComponentsJsonSchema }, ctrl.list)
  fastify.get('/categories', read, ctrl.getCategories)
  fastify.post('/', { ...write, schema: createComponentJsonSchema }, ctrl.create)
  fastify.get('/:id', { ...read, schema: componentIdParamSchema }, ctrl.get)
  fastify.put('/:id', { ...write, schema: updateComponentJsonSchema }, ctrl.update)
  fastify.delete('/:id', { ...del, schema: componentIdParamSchema }, ctrl.remove)
  fastify.post('/:id/deprecate', { ...write, schema: componentIdParamSchema }, ctrl.deprecate)
  fastify.get('/:id/versions', { ...read, schema: componentIdParamSchema }, ctrl.getVersions)
  fastify.post('/:id/versions/:version/restore', { ...write, schema: versionParamSchema }, ctrl.restoreVersion)
}

export default masterComponentRoutes
