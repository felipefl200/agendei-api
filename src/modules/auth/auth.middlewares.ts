import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify'

import { AppError } from '../../shared/errors/app-error.js'

import type { TokenProvider } from './auth.ports.js'
import type { UserRole } from './auth.types.js'
import { jwtTokenProvider } from './token-provider.js'

function authenticateRequest(
  request: FastifyRequest,
  tokenProvider: TokenProvider,
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

export function createAuthenticateMiddleware(tokenProvider: TokenProvider) {
  return function authenticate(
    request: FastifyRequest,
    _reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) {
    try {
      authenticateRequest(request, tokenProvider)
      done()
    } catch (error) {
      done(error as Error)
    }
  }
}

export const authenticate = createAuthenticateMiddleware(jwtTokenProvider)

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
