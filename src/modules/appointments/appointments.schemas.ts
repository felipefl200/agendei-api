import { z } from 'zod'

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const appointmentParamsSchema = z.object({
  id: z.uuid(),
})

export const createAppointmentSchema = z.object({
  doctorId: z.uuid(),
  specialtyId: z.uuid(),
  clinicId: z.uuid(),
  date: z.iso.date(),
  startTime: timeSchema,
})

export const cancelAppointmentSchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
  })
  .strict()

export type AppointmentParams = z.infer<typeof appointmentParamsSchema>
export type CancelAppointmentBody = z.infer<typeof cancelAppointmentSchema>
export type CreateAppointmentBody = z.infer<typeof createAppointmentSchema>
