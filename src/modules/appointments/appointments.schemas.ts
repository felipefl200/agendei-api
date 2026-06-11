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

export type AppointmentParams = z.infer<typeof appointmentParamsSchema>
export type CreateAppointmentBody = z.infer<typeof createAppointmentSchema>
