import { describe, expect, it } from 'vitest'

import {
  createSpecialtySchema,
  specialtyParamsSchema,
  updateSpecialtySchema,
} from './specialties.schemas.js'

describe('specialties schemas', () => {
  it('validates and trims specialty creation input', () => {
    expect(
      createSpecialtySchema.parse({
        name: '  Dermatologia  ',
        description: '  Cuidados com a pele  ',
        icon: '  sparkles  ',
      }),
    ).toEqual({
      name: 'Dermatologia',
      description: 'Cuidados com a pele',
      icon: 'sparkles',
    })
  })

  it('accepts nullable optional fields on creation and update', () => {
    expect(
      createSpecialtySchema.parse({
        name: 'Dermatologia',
        description: null,
        icon: null,
      }),
    ).toEqual({
      name: 'Dermatologia',
      description: null,
      icon: null,
    })

    expect(
      updateSpecialtySchema.parse({
        description: null,
      }),
    ).toEqual({
      description: null,
    })
  })

  it('rejects empty updates and invalid field lengths', () => {
    expect(() => updateSpecialtySchema.parse({})).toThrow()
    expect(() =>
      createSpecialtySchema.parse({
        name: 'D',
      }),
    ).toThrow()
    expect(() =>
      updateSpecialtySchema.parse({
        icon: '',
      }),
    ).toThrow()
  })

  it('validates uuid route params', () => {
    expect(
      specialtyParamsSchema.parse({
        id: '123e4567-e89b-12d3-a456-426614174000',
      }),
    ).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
    })

    expect(() =>
      specialtyParamsSchema.parse({
        id: 'not-a-uuid',
      }),
    ).toThrow()
  })
})
