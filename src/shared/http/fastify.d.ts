import type { AuthenticatedUser } from '../../modules/auth/auth.types.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser
  }
}
