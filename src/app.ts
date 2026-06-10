import { registerAuthRoutes } from './modules/auth/auth.routes.js'
import { registerHealthRoutes } from './modules/health/health.routes.js'
import { createHttpServer } from './shared/http/http-server.js'

export function buildApp() {
  const app = createHttpServer()

  app.register(registerAuthRoutes)
  app.register(registerHealthRoutes)

  return app
}
