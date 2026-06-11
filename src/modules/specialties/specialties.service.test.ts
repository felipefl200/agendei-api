import { describe, expect, it } from 'vitest'

import type {
  CreateSpecialtyInput,
  SpecialtiesRepository,
  Specialty,
  UpdateSpecialtyInput,
} from './specialties.ports.js'
import { createSpecialtiesService } from './specialties.service.js'

const fixedNow = new Date('2026-06-10T12:00:00.000Z')

class InMemorySpecialtiesRepository implements SpecialtiesRepository {
  constructor(private readonly specialties: Map<string, Specialty>) {}

  findActive(): Promise<Specialty[]> {
    return Promise.resolve(
      Array.from(this.specialties.values())
        .filter((specialty) => specialty.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    )
  }

  findActiveById(id: string): Promise<Specialty | null> {
    const specialty = this.specialties.get(id)

    return Promise.resolve(specialty?.active ? specialty : null)
  }

  findById(id: string): Promise<Specialty | null> {
    return Promise.resolve(this.specialties.get(id) ?? null)
  }

  findByName(name: string): Promise<Specialty | null> {
    return Promise.resolve(
      Array.from(this.specialties.values()).find(
        (specialty) => specialty.name === name,
      ) ?? null,
    )
  }

  create(input: CreateSpecialtyInput): Promise<Specialty> {
    const specialty: Specialty = {
      id: `specialty-${this.specialties.size + 1}`,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      active: true,
      createdAt: fixedNow,
      updatedAt: fixedNow,
    }

    this.specialties.set(specialty.id, specialty)

    return Promise.resolve(specialty)
  }

  update(id: string, input: UpdateSpecialtyInput): Promise<Specialty> {
    const specialty = this.specialties.get(id)

    if (!specialty) {
      return Promise.reject(new Error('Specialty not found'))
    }

    const updatedSpecialty: Specialty = {
      ...specialty,
      ...input,
      name: input.name ?? specialty.name,
      description:
        input.description !== undefined
          ? input.description
          : specialty.description,
      icon: input.icon !== undefined ? input.icon : specialty.icon,
      updatedAt: fixedNow,
    }

    this.specialties.set(id, updatedSpecialty)

    return Promise.resolve(updatedSpecialty)
  }

  deactivate(id: string): Promise<Specialty> {
    const specialty = this.specialties.get(id)

    if (!specialty) {
      return Promise.reject(new Error('Specialty not found'))
    }

    const updatedSpecialty = {
      ...specialty,
      active: false,
      updatedAt: fixedNow,
    }

    this.specialties.set(id, updatedSpecialty)

    return Promise.resolve(updatedSpecialty)
  }
}

function makeSpecialty(overrides: Partial<Specialty> = {}): Specialty {
  return {
    id: 'specialty-id',
    name: 'Cardiologia',
    description: 'Cuidados com o coração',
    icon: 'heart-pulse',
    active: true,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    ...overrides,
  }
}

function makeSut(specialties: Specialty[] = [makeSpecialty()]) {
  const specialtiesMap = new Map<string, Specialty>(
    specialties.map((specialty) => [specialty.id, specialty] as const),
  )

  return {
    service: createSpecialtiesService({
      specialtiesRepository: new InMemorySpecialtiesRepository(specialtiesMap),
    }),
    specialties: specialtiesMap,
  }
}

describe('specialties service', () => {
  it('lists active specialties sorted by name', async () => {
    const { service } = makeSut([
      makeSpecialty({ id: 'cardiology-id', name: 'Cardiologia' }),
      makeSpecialty({ id: 'inactive-id', name: 'Dermatologia', active: false }),
      makeSpecialty({ id: 'general-id', name: 'Clínica Geral' }),
    ])

    await expect(service.listActive()).resolves.toMatchObject([
      { id: 'cardiology-id', active: true },
      { id: 'general-id', active: true },
    ])
  })

  it('returns active specialty details', async () => {
    const { service } = makeSut()

    await expect(service.getActiveById('specialty-id')).resolves.toMatchObject({
      id: 'specialty-id',
      name: 'Cardiologia',
    })
  })

  it('rejects missing or inactive public specialty details', async () => {
    const { service } = makeSut([
      makeSpecialty({ id: 'inactive-id', active: false }),
    ])

    await expect(service.getActiveById('missing-id')).rejects.toMatchObject({
      message: 'Specialty not found',
      statusCode: 404,
    })
    await expect(service.getActiveById('inactive-id')).rejects.toMatchObject({
      message: 'Specialty not found',
      statusCode: 404,
    })
  })

  it('creates specialties with unique names', async () => {
    const { service, specialties } = makeSut([])

    const specialty = await service.create({
      name: 'Dermatologia',
      description: 'Cuidados com a pele',
      icon: 'sparkles',
    })

    expect(specialty).toMatchObject({
      name: 'Dermatologia',
      active: true,
    })
    expect(specialties.size).toBe(1)
  })

  it('rejects duplicated names on create and update', async () => {
    const { service } = makeSut([
      makeSpecialty({ id: 'cardiology-id', name: 'Cardiologia' }),
      makeSpecialty({ id: 'general-id', name: 'Clínica Geral' }),
    ])

    await expect(
      service.create({
        name: 'Cardiologia',
      }),
    ).rejects.toMatchObject({
      message: 'Specialty name already exists',
      statusCode: 409,
    })

    await expect(
      service.update('general-id', {
        name: 'Cardiologia',
      }),
    ).rejects.toMatchObject({
      message: 'Specialty name already exists',
      statusCode: 409,
    })
  })

  it('updates specialty editable fields', async () => {
    const { service, specialties } = makeSut()

    const specialty = await service.update('specialty-id', {
      name: 'Dermatologia',
      description: null,
      icon: 'sparkles',
    })

    expect(specialty).toMatchObject({
      id: 'specialty-id',
      name: 'Dermatologia',
      description: null,
      icon: 'sparkles',
    })
    expect(specialties.get('specialty-id')).toMatchObject({
      name: 'Dermatologia',
      description: null,
      icon: 'sparkles',
    })
  })

  it('deactivates specialties instead of deleting them', async () => {
    const { service, specialties } = makeSut()

    const specialty = await service.deactivate('specialty-id')

    expect(specialty.active).toBe(false)
    expect(specialties.has('specialty-id')).toBe(true)
  })

  it('rejects updates and deactivation for missing specialties', async () => {
    const { service } = makeSut([])

    await expect(
      service.update('missing-id', {
        name: 'Dermatologia',
      }),
    ).rejects.toMatchObject({
      message: 'Specialty not found',
      statusCode: 404,
    })

    await expect(service.deactivate('missing-id')).rejects.toMatchObject({
      message: 'Specialty not found',
      statusCode: 404,
    })
  })
})
