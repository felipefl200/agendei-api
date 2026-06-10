import { z } from 'zod'

const emailSchema = z.email().transform((email) => email.toLowerCase())

export const doctorParamsSchema = z.object({
  id: z.uuid(),
})

export const listDoctorsQuerySchema = z.object({
  search: z.string().trim().min(1).max(255).optional(),
  specialtyId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
})

export const createDoctorSchema = z.object({
  name: z.string().trim().min(2).max(255),
  email: emailSchema,
  crm: z.string().trim().min(2).max(50),
  bio: z.string().trim().min(1).max(1000).nullable().optional(),
  avatarUrl: z.string().trim().min(1).max(255).nullable().optional(),
  specialtyId: z.uuid(),
  clinicId: z.uuid(),
})

export const updateDoctorSchema = z
  .object({
    name: z.string().trim().min(2).max(255).optional(),
    email: emailSchema.optional(),
    crm: z.string().trim().min(2).max(50).optional(),
    bio: z.string().trim().min(1).max(1000).nullable().optional(),
    avatarUrl: z.string().trim().min(1).max(255).nullable().optional(),
    specialtyId: z.uuid().optional(),
    clinicId: z.uuid().optional(),
  })
  .refine(
    (input) =>
      input.name !== undefined ||
      input.email !== undefined ||
      input.crm !== undefined ||
      input.bio !== undefined ||
      input.avatarUrl !== undefined ||
      input.specialtyId !== undefined ||
      input.clinicId !== undefined,
    {
      message: 'At least one field must be provided',
    },
  )

export type CreateDoctorBody = z.infer<typeof createDoctorSchema>
export type DoctorParams = z.infer<typeof doctorParamsSchema>
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>
export type UpdateDoctorBody = z.infer<typeof updateDoctorSchema>
