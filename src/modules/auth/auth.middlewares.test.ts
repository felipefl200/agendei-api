import fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'

import { AppError } from '../../shared/errors/app-error.js'

import { authorize, createAuthenticateMiddleware } from './auth.middlewares.js'
import type {
  AuthRevokedToken,
  AuthRevokedTokensRepository,
  TokenProvider,
} from './auth.ports.js'
import { hashAuthToken } from './auth.service.js'

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

function createRevokedTokensRepository(
  revokedTokens: AuthRevokedToken[] = [],
): AuthRevokedTokensRepository {
  return {
    create: vi.fn(),
    findByTokenHash: vi.fn((tokenHash) => {
      return Promise.resolve(
        revokedTokens.find((token) => token.tokenHash === tokenHash) ?? null,
      )
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
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(tokenProvider.verify).toHaveBeenCalledWith(token)
    expect(response.json()).toEqual({
      user: {
        id: 'user-id',
        role: 'patient',
      },
    })
  })

  it('rejects tokens revoked by logout', async () => {
    const app = fastify()
    const token = 'revoked-token'
    const tokenProvider = createTokenProvider()
    const findByTokenHash = vi.fn((tokenHash: string) => {
      return Promise.resolve(
        tokenHash === hashAuthToken(token)
          ? {
              tokenHash,
              expiresAt: new Date(Date.now() + 60_000),
              revokedAt: new Date(),
            }
          : null,
      )
    })
    const revokedTokensRepository = createRevokedTokensRepository([
      {
        tokenHash: hashAuthToken(token),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
      },
    ])
    revokedTokensRepository.findByTokenHash = findByTokenHash

    app.get(
      '/protected',
      {
        preHandler: [
          createAuthenticateMiddleware(tokenProvider, revokedTokensRepository),
        ],
      },
      () => {
        return { ok: true }
      },
    )

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    await app.close()

    expect(response.statusCode).toBe(401)
    expect(findByTokenHash).toHaveBeenCalledWith(hashAuthToken(token))
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
