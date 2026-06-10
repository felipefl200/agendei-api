import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserRole } from '../auth/auth.types.js'

vi.mock(import('./patients.container.js'), () => ({
  patientsService: {
    getMe: vi.fn(),
    updateMe: vi.fn(),
  },
}))

const { patientsService } = await import('./patients.container.js')
const { buildApp } = await import('../../app.js')

const now = new Date('2026-06-10T12:00:00.000Z')
const patient = {
  id: 'patient-id',
  name: 'Maria Silva',
  email: 'maria@example.com',
  phone: '11999999999',
  birthDate: null,
  document: null,
  avatarUrl: null,
  createdAt: now,
  updatedAt: now,
}

function signToken(role: UserRole = 'patient') {
  return jwt.sign({ sub: 'user-id', role }, process.env.JWT_SECRET!)
}

describe('patients routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the authenticated patient profile', async () => {
    vi.mocked(patientsService.getMe).mockResolvedValue(patient)
    const app = buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/patients/me',
      headers: { authorization: `Bearer ${signToken()}` },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(patientsService.getMe).toHaveBeenCalledWith('user-id')
    expect(response.json()).toEqual({
      patient: {
        ...patient,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    })
    expect(JSON.stringify(response.json())).not.toContain('userId')
    expect(JSON.stringify(response.json())).not.toContain('passwordHash')
  })

  it('updates the authenticated patient profile', async () => {
    vi.mocked(patientsService.updateMe).mockResolvedValue({
      ...patient,
      name: 'Ana Silva',
      phone: null,
    })
    const app = buildApp()

    const response = await app.inject({
      method: 'PATCH',
      url: '/patients/me',
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        name: '  Ana Silva  ',
        phone: null,
      },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(patientsService.updateMe).toHaveBeenCalledWith('user-id', {
      name: 'Ana Silva',
      phone: null,
    })
    expect(response.json()).toMatchObject({
      patient: {
        id: 'patient-id',
        name: 'Ana Silva',
        phone: null,
      },
    })
  })

  it('returns 401 for missing or invalid tokens', async () => {
    const app = buildApp()

    const missingTokenResponse = await app.inject({
      method: 'GET',
      url: '/patients/me',
    })

    const invalidTokenResponse = await app.inject({
      method: 'GET',
      url: '/patients/me',
      headers: { authorization: 'Bearer invalid-token' },
    })

    await app.close()

    expect(missingTokenResponse.statusCode).toBe(401)
    expect(invalidTokenResponse.statusCode).toBe(401)
    expect(patientsService.getMe).not.toHaveBeenCalled()
  })

  it('returns 403 for authenticated users without patient role', async () => {
    const app = buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/patients/me',
      headers: { authorization: `Bearer ${signToken('doctor')}` },
    })

    await app.close()

    expect(response.statusCode).toBe(403)
    expect(patientsService.getMe).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid profile updates', async () => {
    const app = buildApp()

    const emptyBodyResponse = await app.inject({
      method: 'PATCH',
      url: '/patients/me',
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {},
    })

    const invalidNameResponse = await app.inject({
      method: 'PATCH',
      url: '/patients/me',
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        name: 'M',
      },
    })

    await app.close()

    expect(emptyBodyResponse.statusCode).toBe(400)
    expect(invalidNameResponse.statusCode).toBe(400)
    expect(patientsService.updateMe).not.toHaveBeenCalled()
  })
})
