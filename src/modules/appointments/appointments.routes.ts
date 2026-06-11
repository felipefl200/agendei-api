import type { FastifyInstance } from 'fastify'

import { authenticate, authorize } from '../auth/auth.middlewares.js'

import {
  createAppointmentController,
  getAppointmentController,
  listHistoryAppointmentsController,
  listUpcomingAppointmentsController,
} from './appointments.controller.js'

export function registerAppointmentsRoutes(app: FastifyInstance) {
  app.post(
    '/appointments',
    { preHandler: [authenticate, authorize(['patient'])] },
    createAppointmentController,
  )
  app.get(
    '/appointments/upcoming',
    { preHandler: [authenticate, authorize(['patient'])] },
    listUpcomingAppointmentsController,
  )
  app.get(
    '/appointments/history',
    { preHandler: [authenticate, authorize(['patient'])] },
    listHistoryAppointmentsController,
  )
  app.get(
    '/appointments/:id',
    { preHandler: [authenticate, authorize(['patient'])] },
    getAppointmentController,
  )
}
