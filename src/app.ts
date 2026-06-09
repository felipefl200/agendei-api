import { registerHealthRoutes } from './modules/health/health.routes.js'
import { createHttpServer } from './shared/http/http-server.js'

export function buildApp() {
  const app = createHttpServer()

  app.register(registerHealthRoutes)

  return app
}
