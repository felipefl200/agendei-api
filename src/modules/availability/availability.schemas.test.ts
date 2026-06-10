import { describe, expect, it } from 'vitest'

import {
  availabilityParamsSchema,
  availableSlotsQuerySchema,
  createAvailabilitySchema,
  doctorAvailabilityParamsSchema,
  updateAvailabilitySchema,
} from './availability.schemas.js'

const doctorId = '123e4567-e89b-12d3-a456-426614174010'
const clinicId = '123e4567-e89b-12d3-a456-426614174001'
const availabilityId = '123e4567-e89b-12d3-a456-426614174020'

describe('availability schemas', () => {
  it('validates route params and available slots query', () => {
    expect(doctorAvailabilityParamsSchema.parse({ doctorId })).toEqual({
      doctorId,
    })
    expect(availabilityParamsSchema.parse({ id: availabilityId })).toEqual({
      id: availabilityId,
    })
    expect(
      availableSlotsQuerySchema.parse({
        date: '2026-06-15',
        clinicId,
      }),
    ).toEqual({
      date: '2026-06-15',
      clinicId,
    })
  })

  it('validates availability creation input', () => {
    expect(
      createAvailabilitySchema.parse({
        clinicId,
        weekday: 1,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationInMinutes: 30,
      }),
    ).toEqual({
      clinicId,
      weekday: 1,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
    })
  })

  it('rejects invalid time ranges and duration', () => {
    expect(() =>
      createAvailabilitySchema.parse({
        clinicId,
        weekday: 1,
        startTime: '12:00',
        endTime: '08:00',
        slotDurationInMinutes: 30,
      }),
    ).toThrow()

    expect(() =>
      createAvailabilitySchema.parse({
        clinicId,
        weekday: 1,
        startTime: '08:00',
        endTime: '09:00',
        slotDurationInMinutes: 90,
      }),
    ).toThrow()
  })

  it('validates partial updates and rejects empty updates', () => {
    expect(
      updateAvailabilitySchema.parse({
        startTime: '09:00',
      }),
    ).toEqual({
      startTime: '09:00',
    })

    expect(() => updateAvailabilitySchema.parse({})).toThrow()
    expect(() =>
      updateAvailabilitySchema.parse({
        weekday: 7,
      }),
    ).toThrow()
  })
})
