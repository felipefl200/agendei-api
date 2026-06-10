import type { FastifyInstance } from 'fastify'

import { authenticate, authorize } from '../auth/auth.middlewares.js'

import {
  getPatientMeController,
  updatePatientMeController,
} from './patients.controller.js'

export function registerPatientsRoutes(app: FastifyInstance) {
  app.get(
    '/patients/me',
    { preHandler: [authenticate, authorize(['patient'])] },
    getPatientMeController,
  )
  app.patch(
    '/patients/me',
    { preHandler: [authenticate, authorize(['patient'])] },
    updatePatientMeController,
  )
}
