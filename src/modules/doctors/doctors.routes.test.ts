import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserRole } from '../auth/auth.types.js'

vi.mock(import('./doctors.container.js'), () => ({
  doctorsService: {
    create: vi.fn(),
    deactivate: vi.fn(),
    getById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
  },
}))

const { doctorsService } = await import('./doctors.container.js')
const { buildApp } = await import('../../app.js')

const now = new Date('2026-06-10T12:00:00.000Z')
const doctorId = '123e4567-e89b-12d3-a456-426614174010'
const specialtyId = '123e4567-e89b-12d3-a456-426614174000'
const clinicId = '123e4567-e89b-12d3-a456-426614174001'
const doctor = {
  id: doctorId,
  name: 'Dra. Juliana Martins',
  email: 'juliana@clinica.com',
  crm: 'CRM/SP 123456',
  bio: 'Médica clínica geral.',
  avatarUrl: 'https://example.com/avatar.png',
  active: true,
  specialty: {
    id: specialtyId,
    name: 'Clínica Geral',
  },
  clinic: {
    id: clinicId,
    name: 'Clínica Saúde & Vida',
    address: 'Rua Exemplo, 123',
  },
  availableToday: true,
  createdAt: now,
  updatedAt: now,
}

function signToken(role: UserRole = 'admin') {
  return jwt.sign({ sub: 'user-id', role }, process.env.JWT_SECRET!)
}

describe('doctors routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists active doctors publicly with filters', async () => {
    vi.mocked(doctorsService.list).mockResolvedValue({
      doctors: [doctor],
      pagination: {
        page: 2,
        perPage: 10,
        total: 11,
        totalPages: 2,
      },
    })
    const app = buildApp()

    const response = await app.inject({
      method: 'GET',
      url: `/doctors?search=juliana&specialtyId=${specialtyId}&page=2&perPage=10`,
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(doctorsService.list).toHaveBeenCalledWith({
      search: 'juliana',
      specialtyId,
      page: 2,
      perPage: 10,
    })
    expect(response.json()).toEqual({
      doctors: [
        {
          ...doctor,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
      pagination: {
        page: 2,
        perPage: 10,
        total: 11,
        totalPages: 2,
      },
    })
  })

  it('returns public active doctor details', async () => {
    vi.mocked(doctorsService.getById).mockResolvedValue(doctor)
    const app = buildApp()

    const response = await app.inject({
      method: 'GET',
      url: `/doctors/${doctorId}`,
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(doctorsService.getById).toHaveBeenCalledWith(doctorId)
    expect(response.json()).toMatchObject({
      doctor: {
        id: doctorId,
        name: 'Dra. Juliana Martins',
        specialty: {
          id: specialtyId,
        },
        clinic: {
          id: clinicId,
        },
      },
    })
  })

  it('creates doctors with admin authorization', async () => {
    vi.mocked(doctorsService.create).mockResolvedValue(doctor)
    const app = buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/admin/doctors',
      headers: { authorization: `Bearer ${signToken('super_admin')}` },
      payload: {
        name: '  Dra. Juliana Martins  ',
        email: 'JULIANA@CLINICA.COM',
        crm: '  CRM/SP 123456  ',
        bio: '  Médica clínica geral.  ',
        specialtyId,
        clinicId,
      },
    })

    await app.close()

    expect(response.statusCode).toBe(201)
    expect(doctorsService.create).toHaveBeenCalledWith({
      name: 'Dra. Juliana Martins',
      email: 'juliana@clinica.com',
      crm: 'CRM/SP 123456',
      bio: 'Médica clínica geral.',
      specialtyId,
      clinicId,
    })
  })

  it('updates doctors with admin authorization', async () => {
    vi.mocked(doctorsService.update).mockResolvedValue({
      ...doctor,
      bio: null,
    })
    const app = buildApp()

    const response = await app.inject({
      method: 'PATCH',
      url: `/admin/doctors/${doctorId}`,
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        bio: null,
      },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(doctorsService.update).toHaveBeenCalledWith(doctorId, {
      bio: null,
    })
    expect(response.json()).toMatchObject({
      doctor: {
        id: doctorId,
        bio: null,
      },
    })
  })

  it('deactivates doctors with admin authorization', async () => {
    vi.mocked(doctorsService.deactivate).mockResolvedValue({
      ...doctor,
      active: false,
    })
    const app = buildApp()

    const response = await app.inject({
      method: 'DELETE',
      url: `/admin/doctors/${doctorId}`,
      headers: { authorization: `Bearer ${signToken()}` },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(doctorsService.deactivate).toHaveBeenCalledWith(doctorId)
    expect(response.json()).toMatchObject({
      doctor: {
        id: doctorId,
        active: false,
      },
    })
  })

  it('protects admin doctor routes', async () => {
    const app = buildApp()

    const missingTokenResponse = await app.inject({
      method: 'POST',
      url: '/admin/doctors',
      payload: {
        name: 'Dra. Juliana Martins',
        email: 'juliana@clinica.com',
        crm: 'CRM/SP 123456',
        specialtyId,
        clinicId,
      },
    })

    const forbiddenResponse = await app.inject({
      method: 'POST',
      url: '/admin/doctors',
      headers: { authorization: `Bearer ${signToken('patient')}` },
      payload: {
        name: 'Dra. Juliana Martins',
        email: 'juliana@clinica.com',
        crm: 'CRM/SP 123456',
        specialtyId,
        clinicId,
      },
    })

    await app.close()

    expect(missingTokenResponse.statusCode).toBe(401)
    expect(forbiddenResponse.statusCode).toBe(403)
    expect(doctorsService.create).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid admin input and params', async () => {
    const app = buildApp()

    const invalidBodyResponse = await app.inject({
      method: 'POST',
      url: '/admin/doctors',
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        name: 'D',
        email: 'invalid-email',
        crm: '1',
        specialtyId,
        clinicId,
      },
    })

    const invalidParamResponse = await app.inject({
      method: 'PATCH',
      url: '/admin/doctors/not-a-uuid',
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        name: 'Dra. Juliana Martins',
      },
    })

    await app.close()

    expect(invalidBodyResponse.statusCode).toBe(400)
    expect(invalidParamResponse.statusCode).toBe(400)
    expect(doctorsService.create).not.toHaveBeenCalled()
    expect(doctorsService.update).not.toHaveBeenCalled()
  })
})
