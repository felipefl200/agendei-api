import type { FastifyInstance } from 'fastify'

import { authenticate, authorize } from '../auth/auth.middlewares.js'

import {
  createSpecialtyController,
  deleteSpecialtyController,
  getSpecialtyController,
  listSpecialtiesController,
  updateSpecialtyController,
} from './specialties.controller.js'

const adminPreHandlers = [authenticate, authorize(['admin', 'super_admin'])]

export function registerSpecialtiesRoutes(app: FastifyInstance) {
  app.get('/specialties', listSpecialtiesController)
  app.get('/specialties/:id', getSpecialtyController)
  app.post(
    '/admin/specialties',
    { preHandler: adminPreHandlers },
    createSpecialtyController,
  )
  app.patch(
    '/admin/specialties/:id',
    { preHandler: adminPreHandlers },
    updateSpecialtyController,
  )
  app.delete(
    '/admin/specialties/:id',
    { preHandler: adminPreHandlers },
    deleteSpecialtyController,
  )
}
