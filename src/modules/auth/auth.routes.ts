import type { FastifyInstance } from 'fastify'

import {
  loginController,
  meController,
  registerPatientController,
} from './auth.controller.js'
import { authenticate } from './auth.middlewares.js'

export function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/register', registerPatientController)
  app.post('/auth/login', loginController)
  app.get('/auth/me', { preHandler: [authenticate] }, meController)
}
