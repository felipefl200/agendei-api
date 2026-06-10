import fastify from 'fastify'
import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'

import { authenticate, authorize } from './auth.middlewares.js'

describe('auth middlewares', () => {
  it('authenticates valid bearer tokens and exposes the user', async () => {
    const app = fastify()
    const token = jwt.sign(
      { sub: 'user-id', role: 'patient' },
      process.env.JWT_SECRET!,
    )

    app.get('/protected', { preHandler: [authenticate] }, (request) => {
      return { user: request.user }
    })

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      user: {
        id: 'user-id',
        role: 'patient',
      },
    })
  })

  it('rejects invalid tokens with 401', async () => {
    const app = fastify()

    app.get('/protected', { preHandler: [authenticate] }, () => {
      return { ok: true }
    })

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
    const token = jwt.sign(
      { sub: 'user-id', role: 'patient' },
      process.env.JWT_SECRET!,
    )

    app.get(
      '/patients-only',
      { preHandler: [authenticate, authorize(['patient'])] },
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
    const token = jwt.sign(
      { sub: 'user-id', role: 'doctor' },
      process.env.JWT_SECRET!,
    )

    app.get(
      '/patients-only',
      { preHandler: [authenticate, authorize(['patient'])] },
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
