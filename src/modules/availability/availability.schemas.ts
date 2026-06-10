import { z } from 'zod'

import { normalizeTimeToMinutes } from './availability.time.js'

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

function validateTimeRange(input: {
  startTime?: string | undefined
  endTime?: string | undefined
  slotDurationInMinutes?: number | undefined
}) {
  if (input.startTime === undefined || input.endTime === undefined) {
    return true
  }

  const start = normalizeTimeToMinutes(input.startTime)
  const end = normalizeTimeToMinutes(input.endTime)

  if (start >= end) {
    return false
  }

  if (input.slotDurationInMinutes === undefined) {
    return true
  }

  return input.slotDurationInMinutes <= end - start
}

export const doctorAvailabilityParamsSchema = z.object({
  doctorId: z.uuid(),
})

export const availabilityParamsSchema = z.object({
  id: z.uuid(),
})

export const availableSlotsQuerySchema = z.object({
  date: z.iso.date(),
  clinicId: z.uuid(),
})

export const createAvailabilitySchema = z
  .object({
    clinicId: z.uuid(),
    weekday: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
    slotDurationInMinutes: z.number().int().min(1),
  })
  .refine(validateTimeRange, {
    message: 'Invalid availability time range',
  })

export const updateAvailabilitySchema = z
  .object({
    clinicId: z.uuid().optional(),
    weekday: z.number().int().min(0).max(6).optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    slotDurationInMinutes: z.number().int().min(1).optional(),
  })
  .refine(
    (input) =>
      input.clinicId !== undefined ||
      input.weekday !== undefined ||
      input.startTime !== undefined ||
      input.endTime !== undefined ||
      input.slotDurationInMinutes !== undefined,
    {
      message: 'At least one field must be provided',
    },
  )

export type AvailabilityParams = z.infer<typeof availabilityParamsSchema>
export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>
export type CreateAvailabilityBody = z.infer<typeof createAvailabilitySchema>
export type DoctorAvailabilityParams = z.infer<
  typeof doctorAvailabilityParamsSchema
>
export type UpdateAvailabilityBody = z.infer<typeof updateAvailabilitySchema>
