import { describe, expect, it } from 'vitest'

import { loginSchema, registerPatientSchema } from './auth.schemas.js'

describe('auth schemas', () => {
  it('normalizes e-mail during patient registration', () => {
    const input = registerPatientSchema.parse({
      name: 'Maria Silva',
      email: 'MARIA@EXAMPLE.COM',
      password: 'strong-password-123',
      birthDate: '1990-01-15',
    })

    expect(input.email).toBe('maria@example.com')
    expect(input.birthDate).toBeInstanceOf(Date)
  })

  it('validates login payload', () => {
    const input = loginSchema.parse({
      email: 'USER@EXAMPLE.COM',
      password: 'strong-password-123',
    })

    expect(input).toEqual({
      email: 'user@example.com',
      password: 'strong-password-123',
    })
  })
})
