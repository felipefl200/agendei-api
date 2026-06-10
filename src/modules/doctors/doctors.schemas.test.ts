import { describe, expect, it } from 'vitest'

import {
  createDoctorSchema,
  doctorParamsSchema,
  listDoctorsQuerySchema,
  updateDoctorSchema,
} from './doctors.schemas.js'

const specialtyId = '123e4567-e89b-12d3-a456-426614174000'
const clinicId = '123e4567-e89b-12d3-a456-426614174001'

describe('doctors schemas', () => {
  it('validates list query filters and pagination defaults', () => {
    expect(listDoctorsQuerySchema.parse({})).toEqual({
      page: 1,
      perPage: 20,
    })

    expect(
      listDoctorsQuerySchema.parse({
        search: '  juliana  ',
        specialtyId,
        page: '2',
        perPage: '10',
      }),
    ).toEqual({
      search: 'juliana',
      specialtyId,
      page: 2,
      perPage: 10,
    })
  })

  it('validates and normalizes doctor creation input', () => {
    expect(
      createDoctorSchema.parse({
        name: '  Dra. Juliana Martins  ',
        email: 'JULIANA@CLINICA.COM',
        crm: '  CRM/SP 123456  ',
        bio: '  Médica clínica geral.  ',
        avatarUrl: '  https://example.com/avatar.png  ',
        specialtyId,
        clinicId,
      }),
    ).toEqual({
      name: 'Dra. Juliana Martins',
      email: 'juliana@clinica.com',
      crm: 'CRM/SP 123456',
      bio: 'Médica clínica geral.',
      avatarUrl: 'https://example.com/avatar.png',
      specialtyId,
      clinicId,
    })
  })

  it('accepts nullable optional fields on update', () => {
    expect(
      updateDoctorSchema.parse({
        bio: null,
        avatarUrl: null,
      }),
    ).toEqual({
      bio: null,
      avatarUrl: null,
    })
  })

  it('rejects invalid inputs', () => {
    expect(() => updateDoctorSchema.parse({})).toThrow()
    expect(() =>
      listDoctorsQuerySchema.parse({
        page: 0,
      }),
    ).toThrow()
    expect(() =>
      createDoctorSchema.parse({
        name: 'D',
        email: 'invalid-email',
        crm: '1',
        specialtyId,
        clinicId,
      }),
    ).toThrow()
    expect(() => doctorParamsSchema.parse({ id: 'not-a-uuid' })).toThrow()
  })
})
