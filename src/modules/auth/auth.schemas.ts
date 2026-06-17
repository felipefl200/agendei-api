import { z } from 'zod'

const emailSchema = z.email().transform((email) => email.toLowerCase())
const hasValidPasswordByteLength = (password: string) =>
  Buffer.byteLength(password, 'utf8') <= 72
const passwordByteLimitMessage = 'A senha não pode ultrapassar 72 bytes.'

export const registerPatientSchema = z.object({
  name: z.string().trim().min(2).max(255),
  email: emailSchema,
  password: z
    .string()
    .min(8)
    .refine(hasValidPasswordByteLength, passwordByteLimitMessage),
  phone: z.string().trim().min(8).max(20).optional(),
  birthDate: z.iso
    .date()
    .transform((birthDate) => new Date(`${birthDate}T00:00:00.000Z`))
    .optional(),
  document: z.string().trim().min(3).max(50).optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1)
    .refine(hasValidPasswordByteLength, passwordByteLimitMessage),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>
