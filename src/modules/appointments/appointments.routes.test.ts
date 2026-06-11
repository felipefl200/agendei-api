import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserRole } from '../auth/auth.types.js'

vi.mock(import('./appointments.container.js'), () => ({
  appointmentsService: {
    create: vi.fn(),
    getById: vi.fn(),
  },
}))

const { appointmentsService } = await import('./appointments.container.js')
const { buildApp } = await import('../../app.js')

const doctorId = '123e4567-e89b-12d3-a456-426614174010'
const specialtyId = '123e4567-e89b-12d3-a456-426614174000'
const clinicId = '123e4567-e89b-12d3-a456-426614174001'
const appointmentId = '123e4567-e89b-12d3-a456-426614174030'
const appointment = {
  id: appointmentId,
  doctor: {
    id: doctorId,
    name: 'Dra. Juliana Martins',
  },
  specialty: {
    id: specialtyId,
    name: 'Clínica Geral',
  },
  clinic: {
    id: clinicId,
    name: 'Clínica Saúde & Vida',
  },
  date: '2026-06-15',
  startTime: '10:30',
  endTime: '11:00',
  status: 'scheduled' as const,
}

function signToken(role: UserRole = 'patient') {
  return jwt.sign({ sub: 'user-id', role }, process.env.JWT_SECRET!)
}

describe('appointments routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates appointments for authenticated patients', async () => {
    vi.mocked(appointmentsService.create).mockResolvedValue(appointment)
    const app = buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      },
    })

    await app.close()

    expect(response.statusCode).toBe(201)
    expect(appointmentsService.create).toHaveBeenCalledWith('user-id', {
      doctorId,
      specialtyId,
      clinicId,
      date: '2026-06-15',
      startTime: '10:30',
    })
    expect(response.json()).toEqual({
      appointment,
    })
  })

  it('returns authenticated patient appointments by id', async () => {
    vi.mocked(appointmentsService.getById).mockResolvedValue(appointment)
    const app = buildApp()

    const response = await app.inject({
      method: 'GET',
      url: `/appointments/${appointmentId}`,
      headers: { authorization: `Bearer ${signToken()}` },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(appointmentsService.getById).toHaveBeenCalledWith(
      'user-id',
      appointmentId,
    )
    expect(response.json()).toEqual({
      appointment,
    })
  })

  it('protects appointment routes', async () => {
    const app = buildApp()

    const missingTokenResponse = await app.inject({
      method: 'POST',
      url: '/appointments',
      payload: {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      },
    })

    const forbiddenResponse = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: { authorization: `Bearer ${signToken('doctor')}` },
      payload: {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      },
    })

    await app.close()

    expect(missingTokenResponse.statusCode).toBe(401)
    expect(forbiddenResponse.statusCode).toBe(403)
    expect(appointmentsService.create).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid appointment input and params', async () => {
    const app = buildApp()

    const invalidBodyResponse = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        doctorId: 'not-a-uuid',
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      },
    })

    const invalidParamResponse = await app.inject({
      method: 'GET',
      url: '/appointments/not-a-uuid',
      headers: { authorization: `Bearer ${signToken()}` },
    })

    await app.close()

    expect(invalidBodyResponse.statusCode).toBe(400)
    expect(invalidParamResponse.statusCode).toBe(400)
    expect(appointmentsService.create).not.toHaveBeenCalled()
    expect(appointmentsService.getById).not.toHaveBeenCalled()
  })
})
