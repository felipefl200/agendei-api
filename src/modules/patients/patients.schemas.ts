import { z } from 'zod'

export const updatePatientProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(255).optional(),
    phone: z.string().trim().min(8).max(20).nullable().optional(),
  })
  .refine((input) => input.name !== undefined || input.phone !== undefined, {
    message: 'At least one field must be provided',
  })

export type UpdatePatientProfileInput = z.infer<
  typeof updatePatientProfileSchema
>
