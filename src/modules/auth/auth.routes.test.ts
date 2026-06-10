import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppError } from '../../shared/errors/app-error.js'

import type { UserRole } from './auth.types.js'

vi.mock(import('./auth.service.js'), () => ({
  getAuthenticatedUser: vi.fn(),
  login: vi.fn(),
  registerPatient: vi.fn(),
}))

const authService = await import('./auth.service.js')
const { buildApp } = await import('../../app.js')

const now = new Date('2026-06-10T12:00:00.000Z')
const safeUser = {
  id: 'user-id',
  name: 'Maria Silva',
  email: 'maria@example.com',
  role: 'patient' as UserRole,
  active: true,
  lastLoginAt: null,
  createdAt: now,
  updatedAt: now,
}
const patient = {
  id: 'patient-id',
  userId: safeUser.id,
  phone: '11999999999',
  birthDate: null,
  document: null,
  avatarUrl: null,
  createdAt: now,
  updatedAt: now,
}

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers a patient account without returning passwordHash', async () => {
    vi.mocked(authService.registerPatient).mockResolvedValue({
      user: safeUser,
      patient,
      token: 'access-token',
    })
    const app = buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Maria Silva',
        email: 'MARIA@EXAMPLE.COM',
        password: 'strong-password-123',
        phone: '11999999999',
      },
    })

    await app.close()

    expect(response.statusCode).toBe(201)
    expect(authService.registerPatient).toHaveBeenCalledWith({
      name: 'Maria Silva',
      email: 'maria@example.com',
      password: 'strong-password-123',
      phone: '11999999999',
    })
    expect(JSON.stringify(response.json())).not.toContain('passwordHash')
  })

  it('logs in with e-mail and password', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      user: safeUser,
      token: 'access-token',
    })
    const app = buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'MARIA@EXAMPLE.COM',
        password: 'strong-password-123',
      },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(authService.login).toHaveBeenCalledWith({
      email: 'maria@example.com',
      password: 'strong-password-123',
    })
    expect(JSON.stringify(response.json())).not.toContain('passwordHash')
  })

  it('returns 401 for invalid login', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new AppError('Invalid credentials', 401),
    )
    const app = buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'maria@example.com',
        password: 'wrong-password',
      },
    })

    await app.close()

    expect(response.statusCode).toBe(401)
  })

  it('returns the authenticated user for valid tokens', async () => {
    vi.mocked(authService.getAuthenticatedUser).mockResolvedValue(safeUser)
    const app = buildApp()
    const token = jwt.sign(
      { sub: safeUser.id, role: safeUser.role },
      process.env.JWT_SECRET!,
    )

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(authService.getAuthenticatedUser).toHaveBeenCalledWith(safeUser.id)
    expect(JSON.stringify(response.json())).not.toContain('passwordHash')
  })

  it('returns 401 for invalid tokens', async () => {
    const app = buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer invalid-token' },
    })

    await app.close()

    expect(response.statusCode).toBe(401)
    expect(authService.getAuthenticatedUser).not.toHaveBeenCalled()
  })
})
