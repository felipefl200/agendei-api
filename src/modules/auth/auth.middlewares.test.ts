import fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'

import { AppError } from '../../shared/errors/app-error.js'

import type { TokenProvider } from './auth.ports.js'
import { authorize, createAuthenticateMiddleware } from './auth.middlewares.js'

function createTokenProvider(
  role: 'patient' | 'doctor' = 'patient',
): TokenProvider {
  return {
    sign: vi.fn(),
    verify: vi.fn(() => ({
      sub: 'user-id',
      role,
    })),
  }
}

function createInvalidTokenProvider(): TokenProvider {
  return {
    sign: vi.fn(),
    verify: vi.fn(() => {
      throw new AppError('Invalid token', 401)
    }),
  }
}

describe('auth middlewares', () => {
  it('authenticates valid bearer tokens and exposes the user', async () => {
    const app = fastify()
    const token = 'valid-token'
    const tokenProvider = createTokenProvider()

    app.get(
      '/protected',
      { preHandler: [createAuthenticateMiddleware(tokenProvider)] },
      (request) => {
        return { user: request.user }
      },
    )

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(tokenProvider.verify).toHaveBeenCalledWith(token)
    expect(response.json()).toEqual({
      user: {
        id: 'user-id',
        role: 'patient',
      },
    })
  })

  it('rejects invalid tokens with 401', async () => {
    const app = fastify()
    const tokenProvider = createInvalidTokenProvider()

    app.get(
      '/protected',
      { preHandler: [createAuthenticateMiddleware(tokenProvider)] },
      () => {
        return { ok: true }
      },
    )

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer invalid-token' },
    })

    await app.close()

    expect(response.statusCode).toBe(401)
  })

  it('authorizes allowed roles', async () => {
    const app = fastify()
    const token = 'valid-token'
    const tokenProvider = createTokenProvider('patient')

    app.get(
      '/patients-only',
      {
        preHandler: [
          createAuthenticateMiddleware(tokenProvider),
          authorize(['patient']),
        ],
      },
      () => {
        return { ok: true }
      },
    )

    const response = await app.inject({
      method: 'GET',
      url: '/patients-only',
      headers: { authorization: `Bearer ${token}` },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
  })

  it('rejects forbidden roles with 403', async () => {
    const app = fastify()
    const token = 'valid-token'
    const tokenProvider = createTokenProvider('doctor')

    app.get(
      '/patients-only',
      {
        preHandler: [
          createAuthenticateMiddleware(tokenProvider),
          authorize(['patient']),
        ],
      },
      () => {
        return { ok: true }
      },
    )

    const response = await app.inject({
      method: 'GET',
      url: '/patients-only',
      headers: { authorization: `Bearer ${token}` },
    })

    await app.close()

    expect(response.statusCode).toBe(403)
  })
})
