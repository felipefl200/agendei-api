import { registerAuthRoutes } from './modules/auth/auth.routes.js'
import { registerAvailabilityRoutes } from './modules/availability/availability.routes.js'
import { registerDoctorsRoutes } from './modules/doctors/doctors.routes.js'
import { registerHealthRoutes } from './modules/health/health.routes.js'
import { registerPatientsRoutes } from './modules/patients/patients.routes.js'
import { registerSpecialtiesRoutes } from './modules/specialties/specialties.routes.js'
import { createHttpServer } from './shared/http/http-server.js'

export function buildApp() {
  const app = createHttpServer()

  app.register(registerAvailabilityRoutes)
  app.register(registerAuthRoutes)
  app.register(registerDoctorsRoutes)
  app.register(registerHealthRoutes)
  app.register(registerPatientsRoutes)
  app.register(registerSpecialtiesRoutes)

  return app
}
