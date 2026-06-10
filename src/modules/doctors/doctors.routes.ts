import type { FastifyInstance } from 'fastify'

import { authenticate, authorize } from '../auth/auth.middlewares.js'

import {
  createDoctorController,
  deleteDoctorController,
  getDoctorController,
  listDoctorsController,
  updateDoctorController,
} from './doctors.controller.js'

const adminPreHandlers = [authenticate, authorize(['admin', 'super_admin'])]

export function registerDoctorsRoutes(app: FastifyInstance) {
  app.get('/doctors', listDoctorsController)
  app.get('/doctors/:id', getDoctorController)
  app.post(
    '/admin/doctors',
    { preHandler: adminPreHandlers },
    createDoctorController,
  )
  app.patch(
    '/admin/doctors/:id',
    { preHandler: adminPreHandlers },
    updateDoctorController,
  )
  app.delete(
    '/admin/doctors/:id',
    { preHandler: adminPreHandlers },
    deleteDoctorController,
  )
}
