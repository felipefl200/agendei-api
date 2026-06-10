import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify'
import jwt from 'jsonwebtoken'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'

import type { JwtPayload, UserRole } from './auth.types.js'

function isJwtPayload(payload: unknown): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as JwtPayload).sub === 'string' &&
    ['patient', 'doctor', 'admin', 'super_admin'].includes(
      (payload as JwtPayload).role,
    )
  )
}

function authenticateRequest(request: FastifyRequest) {
  const authorization = request.headers.authorization

  if (!authorization) {
    throw new AppError('Missing authorization token', 401)
  }

  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Invalid authorization token', 401)
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET)

    if (!isJwtPayload(payload)) {
      throw new AppError('Invalid token', 401)
    }

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

export function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction,
) {
  try {
    authenticateRequest(request)
    done()
  } catch (error) {
    done(error as Error)
  }
}

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
