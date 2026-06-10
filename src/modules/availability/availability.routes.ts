import type { FastifyInstance } from 'fastify'

import { authenticate, authorize } from '../auth/auth.middlewares.js'

import {
  createDoctorAvailabilityController,
  deleteAvailabilityController,
  getAvailableSlotsController,
  listDoctorAvailabilityController,
  updateAvailabilityController,
} from './availability.controller.js'

const adminPreHandlers = [authenticate, authorize(['admin', 'super_admin'])]

export function registerAvailabilityRoutes(app: FastifyInstance) {
  app.get('/doctors/:doctorId/available-slots', getAvailableSlotsController)
  app.post(
    '/admin/doctors/:doctorId/availability',
    { preHandler: adminPreHandlers },
    createDoctorAvailabilityController,
  )
  app.get(
    '/admin/doctors/:doctorId/availability',
    { preHandler: adminPreHandlers },
    listDoctorAvailabilityController,
  )
  app.patch(
    '/admin/availability/:id',
    { preHandler: adminPreHandlers },
    updateAvailabilityController,
  )
  app.delete(
    '/admin/availability/:id',
    { preHandler: adminPreHandlers },
    deleteAvailabilityController,
  )
}
