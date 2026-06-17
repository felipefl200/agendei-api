import type { FastifyInstance } from 'fastify'

import { authenticate } from '../auth/auth.middlewares.js'

import { updateProfileAvatarController } from './profile.controller.js'

export function registerProfileRoutes(app: FastifyInstance) {
  app.put(
    '/profile/avatar',
    { preHandler: [authenticate] },
    updateProfileAvatarController,
  )
}
