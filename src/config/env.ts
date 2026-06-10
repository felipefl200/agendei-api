import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.url(),
  HOST: z.string().default('0.0.0.0'),
})

export const env = envSchema.parse(process.env)
