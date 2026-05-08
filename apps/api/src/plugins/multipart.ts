import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'
import type { FastifyPluginAsync } from 'fastify'

const multipartPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100 MB
      files: 10,
      fields: 20,
    },
    attachFieldsToBody: false,
  })
}

export default fp(multipartPlugin, { name: 'multipart' })
