import type { FastifyInstance } from 'fastify'

import { healthCheckController } from './health.controller.js'

export function registerHealthRoutes(app: FastifyInstance) {
  app.get('/health', healthCheckController)
}
