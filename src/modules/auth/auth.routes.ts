import type { FastifyInstance } from 'fastify'

import {
  loginController,
  logoutController,
  meController,
  registerPatientController,
} from './auth.controller.js'
import { authenticate } from './auth.middlewares.js'

export function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/register', registerPatientController)
  app.post('/auth/login', loginController)
  app.post('/auth/logout', { preHandler: [authenticate] }, logoutController)
  app.get('/auth/me', { preHandler: [authenticate] }, meController)
}
