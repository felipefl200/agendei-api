import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify'

import { db } from '../../shared/database/index.js'
import { AppError } from '../../shared/errors/app-error.js'

import type {
  AuthRevokedTokensRepository,
  TokenProvider,
} from './auth.ports.js'
import { DrizzleAuthRevokedTokensRepository } from './auth.repositories.js'
import { hashAuthToken } from './auth.service.js'
import type { UserRole } from './auth.types.js'
import { jwtTokenProvider } from './token-provider.js'

async function authenticateRequest(
  request: FastifyRequest,
  tokenProvider: TokenProvider,
  revokedTokensRepository?: AuthRevokedTokensRepository,
) {
  const authorization = request.headers.authorization

  if (!authorization) {
    throw new AppError('Missing authorization token', 401)
  }

  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Invalid authorization token', 401)
  }

  try {
    const payload = tokenProvider.verify(token)

    if (revokedTokensRepository) {
      const revokedToken = await revokedTokensRepository.findByTokenHash(
        hashAuthToken(token),
      )

      if (revokedToken && revokedToken.expiresAt > new Date()) {
        throw new AppError('Invalid token', 401)
      }
    }

    request.authToken = token
    request.user = {
      id: payload.sub,
      role: payload.role,
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError('Invalid token', 401)
  }
}

export function createAuthenticateMiddleware(
  tokenProvider: TokenProvider,
  revokedTokensRepository?: AuthRevokedTokensRepository,
) {
  return async function authenticate(
    request: FastifyRequest,
    _reply: FastifyReply,
  ) {
    await authenticateRequest(request, tokenProvider, revokedTokensRepository)
  }
}

export const authenticate = createAuthenticateMiddleware(
  jwtTokenProvider,
  process.env.NODE_ENV === 'test'
    ? undefined
    : new DrizzleAuthRevokedTokensRepository(db),
)

export function authorize(allowedRoles: UserRole[]) {
  return function authorizeMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) {
    try {
      if (!request.user) {
        throw new AppError('Unauthenticated', 401)
      }

      if (!allowedRoles.includes(request.user.role)) {
        throw new AppError('Forbidden', 403)
      }

      done()
    } catch (error) {
      done(error as Error)
    }
  }
}
