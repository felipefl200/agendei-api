import jwt, { type SignOptions } from 'jsonwebtoken'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'

import type { TokenProvider } from './auth.ports.js'
import type { JwtPayload } from './auth.types.js'

const jwtExpiresIn = env.JWT_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>

const jwtOptions: SignOptions = {
  expiresIn: jwtExpiresIn,
}

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

export class JwtTokenProvider implements TokenProvider {
  sign(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, jwtOptions)
  }

  verify(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET)

      if (!isJwtPayload(payload)) {
        throw new AppError('Invalid token', 401)
      }

      return payload
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('Invalid token', 401)
    }
  }
}

export const jwtTokenProvider = new JwtTokenProvider()
