import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserRole } from '../auth/auth.types.js'

vi.mock(import('./specialties.container.js'), () => ({
  specialtiesService: {
    create: vi.fn(),
    deactivate: vi.fn(),
    getActiveById: vi.fn(),
    listActive: vi.fn(),
    update: vi.fn(),
  },
}))

const { specialtiesService } = await import('./specialties.container.js')
const { buildApp } = await import('../../app.js')

const now = new Date('2026-06-10T12:00:00.000Z')
const specialty = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Cardiologia',
  description: 'Cuidados com o coração',
  icon: 'heart-pulse',
  active: true,
  createdAt: now,
  updatedAt: now,
}

function signToken(role: UserRole = 'admin') {
  return jwt.sign({ sub: 'user-id', role }, process.env.JWT_SECRET!)
}

describe('specialties routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists active specialties publicly', async () => {
    vi.mocked(specialtiesService.listActive).mockResolvedValue([specialty])
    const app = buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/specialties',
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(specialtiesService.listActive).toHaveBeenCalled()
    expect(response.json()).toEqual({
      specialties: [
        {
          ...specialty,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
    })
  })

  it('returns public active specialty details', async () => {
    vi.mocked(specialtiesService.getActiveById).mockResolvedValue(specialty)
    const app = buildApp()

    const response = await app.inject({
      method: 'GET',
      url: `/specialties/${specialty.id}`,
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(specialtiesService.getActiveById).toHaveBeenCalledWith(specialty.id)
    expect(response.json()).toMatchObject({
      specialty: {
        id: specialty.id,
        name: 'Cardiologia',
      },
    })
  })

  it('creates specialties with admin authorization', async () => {
    vi.mocked(specialtiesService.create).mockResolvedValue(specialty)
    const app = buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/admin/specialties',
      headers: { authorization: `Bearer ${signToken('super_admin')}` },
      payload: {
        name: '  Cardiologia  ',
        description: '  Cuidados com o coração  ',
        icon: '  heart-pulse  ',
      },
    })

    await app.close()

    expect(response.statusCode).toBe(201)
    expect(specialtiesService.create).toHaveBeenCalledWith({
      name: 'Cardiologia',
      description: 'Cuidados com o coração',
      icon: 'heart-pulse',
    })
  })

  it('updates specialties with admin authorization', async () => {
    vi.mocked(specialtiesService.update).mockResolvedValue({
      ...specialty,
      description: null,
    })
    const app = buildApp()

    const response = await app.inject({
      method: 'PATCH',
      url: `/admin/specialties/${specialty.id}`,
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        description: null,
      },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(specialtiesService.update).toHaveBeenCalledWith(specialty.id, {
      description: null,
    })
    expect(response.json()).toMatchObject({
      specialty: {
        id: specialty.id,
        description: null,
      },
    })
  })

  it('deactivates specialties with admin authorization', async () => {
    vi.mocked(specialtiesService.deactivate).mockResolvedValue({
      ...specialty,
      active: false,
    })
    const app = buildApp()

    const response = await app.inject({
      method: 'DELETE',
      url: `/admin/specialties/${specialty.id}`,
      headers: { authorization: `Bearer ${signToken()}` },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(specialtiesService.deactivate).toHaveBeenCalledWith(specialty.id)
    expect(response.json()).toMatchObject({
      specialty: {
        id: specialty.id,
        active: false,
      },
    })
  })

  it('protects admin specialty routes', async () => {
    const app = buildApp()

    const missingTokenResponse = await app.inject({
      method: 'POST',
      url: '/admin/specialties',
      payload: {
        name: 'Dermatologia',
      },
    })

    const forbiddenResponse = await app.inject({
      method: 'POST',
      url: '/admin/specialties',
      headers: { authorization: `Bearer ${signToken('patient')}` },
      payload: {
        name: 'Dermatologia',
      },
    })

    await app.close()

    expect(missingTokenResponse.statusCode).toBe(401)
    expect(forbiddenResponse.statusCode).toBe(403)
    expect(specialtiesService.create).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid admin input and params', async () => {
    const app = buildApp()

    const invalidBodyResponse = await app.inject({
      method: 'POST',
      url: '/admin/specialties',
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        name: 'D',
      },
    })

    const invalidParamResponse = await app.inject({
      method: 'PATCH',
      url: '/admin/specialties/not-a-uuid',
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        name: 'Dermatologia',
      },
    })

    await app.close()

    expect(invalidBodyResponse.statusCode).toBe(400)
    expect(invalidParamResponse.statusCode).toBe(400)
    expect(specialtiesService.create).not.toHaveBeenCalled()
    expect(specialtiesService.update).not.toHaveBeenCalled()
  })
})
