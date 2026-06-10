import { defineConfig } from 'drizzle-kit'
import { env } from './src/config/env.js'

export default defineConfig({
  schema: './src/shared/database/schema/index.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
