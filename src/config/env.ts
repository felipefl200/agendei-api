import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.url(),
  HOST: z.string().default('0.0.0.0'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1d'),
  UPLOADS_DIR: z.string().trim().min(1).default('uploads'),
  AVATAR_MAX_BYTES: z.coerce.number().int().positive().default(2_097_152),
  PUBLIC_BASE_URL: z.url().optional(),
})

type ResolvePublicBaseUrlInput = {
  explicitBaseUrl?: string | undefined
  nodeEnv: 'development' | 'test' | 'production'
  port: number
}

export function resolvePublicBaseUrl(input: ResolvePublicBaseUrlInput): string {
  if (input.explicitBaseUrl) {
    return input.explicitBaseUrl
  }

  if (input.nodeEnv === 'production') {
    return 'https://board.linenetwork.com.br'
  }

  return `http://localhost:${input.port}`
}

const parsedEnv = envSchema.parse(process.env)

export const env = {
  ...parsedEnv,
  PUBLIC_BASE_URL: resolvePublicBaseUrl({
    explicitBaseUrl: parsedEnv.PUBLIC_BASE_URL,
    nodeEnv: parsedEnv.NODE_ENV,
    port: parsedEnv.PORT,
  }),
}
