import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserRole } from '../auth/auth.types.js'

vi.mock(import('./availability.container.js'), () => ({
  availabilityService: {
    create: vi.fn(),
    deactivate: vi.fn(),
    getAvailableSlots: vi.fn(),
    listByDoctor: vi.fn(),
    update: vi.fn(),
  },
}))

const { availabilityService } = await import('./availability.container.js')
const { buildApp } = await import('../../app.js')

const now = new Date('2026-06-10T12:00:00.000Z')
const doctorId = '123e4567-e89b-12d3-a456-426614174010'
const clinicId = '123e4567-e89b-12d3-a456-426614174001'
const availabilityId = '123e4567-e89b-12d3-a456-426614174020'
const availability = {
  id: availabilityId,
  doctorId,
  clinicId,
  weekday: 1,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  active: true,
  createdAt: now,
  updatedAt: now,
}

function signToken(role: UserRole = 'admin') {
  return jwt.sign({ sub: 'user-id', role }, process.env.JWT_SECRET!)
}

describe('availability routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns available slots publicly for doctor, clinic, and date', async () => {
    vi.mocked(availabilityService.getAvailableSlots).mockResolvedValue({
      doctorId,
      clinicId,
      date: '2026-06-15',
      slots: [
        { time: '08:00', available: true },
        { time: '08:30', available: true },
      ],
    })
    const app = buildApp()

    const response = await app.inject({
      method: 'GET',
      url: `/doctors/${doctorId}/available-slots?date=2026-06-15&clinicId=${clinicId}`,
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(availabilityService.getAvailableSlots).toHaveBeenCalledWith(
      doctorId,
      {
        date: '2026-06-15',
        clinicId,
      },
    )
    expect(response.json()).toEqual({
      doctorId,
      clinicId,
      date: '2026-06-15',
      slots: [
        { time: '08:00', available: true },
        { time: '08:30', available: true },
      ],
    })
  })

  it('lists doctor availability rules with admin authorization', async () => {
    vi.mocked(availabilityService.listByDoctor).mockResolvedValue([
      availability,
    ])
    const app = buildApp()

    const response = await app.inject({
      method: 'GET',
      url: `/admin/doctors/${doctorId}/availability`,
      headers: { authorization: `Bearer ${signToken()}` },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(availabilityService.listByDoctor).toHaveBeenCalledWith(doctorId)
    expect(response.json()).toEqual({
      availability: [
        {
          ...availability,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
    })
  })

  it('creates doctor availability rules with admin authorization', async () => {
    vi.mocked(availabilityService.create).mockResolvedValue(availability)
    const app = buildApp()

    const response = await app.inject({
      method: 'POST',
      url: `/admin/doctors/${doctorId}/availability`,
      headers: { authorization: `Bearer ${signToken('super_admin')}` },
      payload: {
        clinicId,
        weekday: 1,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationInMinutes: 30,
      },
    })

    await app.close()

    expect(response.statusCode).toBe(201)
    expect(availabilityService.create).toHaveBeenCalledWith(doctorId, {
      clinicId,
      weekday: 1,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
    })
  })

  it('updates availability rules with admin authorization', async () => {
    vi.mocked(availabilityService.update).mockResolvedValue({
      ...availability,
      endTime: '13:00',
    })
    const app = buildApp()

    const response = await app.inject({
      method: 'PATCH',
      url: `/admin/availability/${availabilityId}`,
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        endTime: '13:00',
      },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(availabilityService.update).toHaveBeenCalledWith(availabilityId, {
      endTime: '13:00',
    })
    expect(response.json()).toMatchObject({
      availability: {
        id: availabilityId,
        endTime: '13:00',
      },
    })
  })

  it('deactivates availability rules with admin authorization', async () => {
    vi.mocked(availabilityService.deactivate).mockResolvedValue({
      ...availability,
      active: false,
    })
    const app = buildApp()

    const response = await app.inject({
      method: 'DELETE',
      url: `/admin/availability/${availabilityId}`,
      headers: { authorization: `Bearer ${signToken()}` },
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(availabilityService.deactivate).toHaveBeenCalledWith(availabilityId)
    expect(response.json()).toMatchObject({
      availability: {
        id: availabilityId,
        active: false,
      },
    })
  })

  it('protects admin availability routes', async () => {
    const app = buildApp()

    const missingTokenResponse = await app.inject({
      method: 'POST',
      url: `/admin/doctors/${doctorId}/availability`,
      payload: {
        clinicId,
        weekday: 1,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationInMinutes: 30,
      },
    })

    const forbiddenResponse = await app.inject({
      method: 'POST',
      url: `/admin/doctors/${doctorId}/availability`,
      headers: { authorization: `Bearer ${signToken('patient')}` },
      payload: {
        clinicId,
        weekday: 1,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationInMinutes: 30,
      },
    })

    await app.close()

    expect(missingTokenResponse.statusCode).toBe(401)
    expect(forbiddenResponse.statusCode).toBe(403)
    expect(availabilityService.create).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid params, query, and body', async () => {
    const app = buildApp()

    const invalidQueryResponse = await app.inject({
      method: 'GET',
      url: `/doctors/${doctorId}/available-slots?date=invalid-date&clinicId=${clinicId}`,
    })

    const invalidBodyResponse = await app.inject({
      method: 'POST',
      url: `/admin/doctors/${doctorId}/availability`,
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        clinicId,
        weekday: 1,
        startTime: '12:00',
        endTime: '08:00',
        slotDurationInMinutes: 30,
      },
    })

    const invalidParamResponse = await app.inject({
      method: 'PATCH',
      url: '/admin/availability/not-a-uuid',
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {
        endTime: '13:00',
      },
    })

    await app.close()

    expect(invalidQueryResponse.statusCode).toBe(400)
    expect(invalidBodyResponse.statusCode).toBe(400)
    expect(invalidParamResponse.statusCode).toBe(400)
    expect(availabilityService.getAvailableSlots).not.toHaveBeenCalled()
    expect(availabilityService.create).not.toHaveBeenCalled()
    expect(availabilityService.update).not.toHaveBeenCalled()
  })
})
