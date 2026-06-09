import { env } from './config/env.js'
import { logger } from './shared/logger/logger.js'
import { buildApp } from './app.js'

const app = buildApp()

try {
  await app.listen({
    host: env.HOST,
    port: env.PORT,
  })

  logger.info(`HTTP server running at http://${env.HOST}:${env.PORT}`)
} catch (error) {
  logger.error('Failed to start HTTP server', error)
  process.exit(1)
}
