import { z } from 'zod'

export const specialtyParamsSchema = z.object({
  id: z.uuid(),
})

export const createSpecialtySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(1).max(500).nullable().optional(),
  icon: z.string().trim().min(1).max(100).nullable().optional(),
})

export const updateSpecialtySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().min(1).max(500).nullable().optional(),
    icon: z.string().trim().min(1).max(100).nullable().optional(),
  })
  .refine(
    (input) =>
      input.name !== undefined ||
      input.description !== undefined ||
      input.icon !== undefined,
    {
      message: 'At least one field must be provided',
    },
  )

export type CreateSpecialtyBody = z.infer<typeof createSpecialtySchema>
export type SpecialtyParams = z.infer<typeof specialtyParamsSchema>
export type UpdateSpecialtyBody = z.infer<typeof updateSpecialtySchema>
