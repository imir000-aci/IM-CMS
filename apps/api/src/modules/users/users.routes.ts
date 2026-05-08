import type { FastifyPluginAsync } from 'fastify'
import * as ctrl from './users.controller.js'
import {
  listUsersJsonSchema,
  createUserJsonSchema,
  updateUserJsonSchema,
  userIdParamSchema,
} from './users.schema.js'

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate] }
  const adminOnly = { preHandler: [fastify.authenticate, fastify.requirePermission('user:manage')] }

  fastify.get('/', { ...auth, schema: listUsersJsonSchema }, ctrl.listUsers)
  fastify.post('/', { ...adminOnly, schema: createUserJsonSchema }, ctrl.createUser)
  fastify.get('/:id', { ...auth, schema: userIdParamSchema }, ctrl.getUser)
  fastify.patch('/:id', { ...adminOnly, schema: updateUserJsonSchema }, ctrl.updateUser)
  fastify.delete('/:id', { ...adminOnly, schema: userIdParamSchema }, ctrl.deactivateUser)
}

export default usersRoutes
