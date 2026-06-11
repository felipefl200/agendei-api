import type { FastifyInstance } from 'fastify'

import { authenticate, authorize } from '../auth/auth.middlewares.js'

import {
  createAppointmentController,
  getAppointmentController,
} from './appointments.controller.js'

export function registerAppointmentsRoutes(app: FastifyInstance) {
  app.post(
    '/appointments',
    { preHandler: [authenticate, authorize(['patient'])] },
    createAppointmentController,
  )
  app.get(
    '/appointments/:id',
    { preHandler: [authenticate, authorize(['patient'])] },
    getAppointmentController,
  )
}
