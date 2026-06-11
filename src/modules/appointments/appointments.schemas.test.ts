import { describe, expect, it } from 'vitest'

import {
  appointmentParamsSchema,
  createAppointmentSchema,
} from './appointments.schemas.js'

const doctorId = '123e4567-e89b-12d3-a456-426614174010'
const specialtyId = '123e4567-e89b-12d3-a456-426614174000'
const clinicId = '123e4567-e89b-12d3-a456-426614174001'
const appointmentId = '123e4567-e89b-12d3-a456-426614174030'

describe('appointments schemas', () => {
  it('validates appointment creation input', () => {
    expect(
      createAppointmentSchema.parse({
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).toEqual({
      doctorId,
      specialtyId,
      clinicId,
      date: '2026-06-15',
      startTime: '10:30',
    })
  })

  it('validates appointment params', () => {
    expect(appointmentParamsSchema.parse({ id: appointmentId })).toEqual({
      id: appointmentId,
    })
  })

  it('rejects invalid creation input', () => {
    expect(() =>
      createAppointmentSchema.parse({
        doctorId: 'not-a-uuid',
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).toThrow()

    expect(() =>
      createAppointmentSchema.parse({
        doctorId,
        specialtyId,
        clinicId,
        date: 'invalid-date',
        startTime: '10:30',
      }),
    ).toThrow()

    expect(() =>
      createAppointmentSchema.parse({
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '25:00',
      }),
    ).toThrow()
  })
})
