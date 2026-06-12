import { env } from './config/env'
import { buildApp } from './app'

async function bootstrap() {
  const app = await buildApp()

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  })
}

void bootstrap().catch((error) => {
  console.error(error)
  process.exit(1)
})
