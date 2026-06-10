import { describe, expect, it } from 'vitest'

import { updatePatientProfileSchema } from './patients.schemas.js'

describe('patients schemas', () => {
  it('accepts partial profile updates', () => {
    expect(
      updatePatientProfileSchema.parse({
        name: '  Maria Silva  ',
      }),
    ).toEqual({
      name: 'Maria Silva',
    })

    expect(
      updatePatientProfileSchema.parse({
        phone: '  11999999999  ',
      }),
    ).toEqual({
      phone: '11999999999',
    })
  })

  it('accepts null phone to clear the patient phone', () => {
    expect(
      updatePatientProfileSchema.parse({
        phone: null,
      }),
    ).toEqual({
      phone: null,
    })
  })

  it('rejects empty profile updates', () => {
    expect(() => updatePatientProfileSchema.parse({})).toThrow()
  })

  it('rejects invalid name and phone values', () => {
    expect(() =>
      updatePatientProfileSchema.parse({
        name: 'M',
      }),
    ).toThrow()

    expect(() =>
      updatePatientProfileSchema.parse({
        phone: '1234567',
      }),
    ).toThrow()
  })
})
