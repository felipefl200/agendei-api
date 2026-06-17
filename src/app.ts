import { mkdirSync } from 'node:fs'
import path from 'node:path'

import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'

import { env } from './config/env.js'
import { registerAppointmentsRoutes } from './modules/appointments/appointments.routes.js'
import { registerAuthRoutes } from './modules/auth/auth.routes.js'
import { registerAvailabilityRoutes } from './modules/availability/availability.routes.js'
import { registerDoctorsRoutes } from './modules/doctors/doctors.routes.js'
import { registerHealthRoutes } from './modules/health/health.routes.js'
import { registerPatientsRoutes } from './modules/patients/patients.routes.js'
import { registerProfileRoutes } from './modules/profile/profile.routes.js'
import { registerSpecialtiesRoutes } from './modules/specialties/specialties.routes.js'
import { createHttpServer } from './shared/http/http-server.js'

export function buildApp() {
  const app = createHttpServer()
  const uploadsRoot = path.resolve(env.UPLOADS_DIR)

  mkdirSync(uploadsRoot, { recursive: true })

  app.register(multipart, {
    limits: {
      fileSize: env.AVATAR_MAX_BYTES,
      files: 1,
    },
  })
  app.register(fastifyStatic, {
    prefix: '/uploads/',
    root: uploadsRoot,
  })

  app.register(registerAppointmentsRoutes)
  app.register(registerAvailabilityRoutes)
  app.register(registerAuthRoutes)
  app.register(registerDoctorsRoutes)
  app.register(registerHealthRoutes)
  app.register(registerPatientsRoutes)
  app.register(registerProfileRoutes)
  app.register(registerSpecialtiesRoutes)

  return app
}
