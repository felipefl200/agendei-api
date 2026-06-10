import { AppError } from '../../shared/errors/app-error.js'

import type {
  CreateSpecialtyInput,
  SpecialtiesRepository,
  Specialty,
  UpdateSpecialtyInput,
} from './specialties.ports.js'

type SpecialtiesServiceDeps = {
  specialtiesRepository: SpecialtiesRepository
}

async function ensureUniqueName(
  repository: SpecialtiesRepository,
  name: string | undefined,
  currentSpecialtyId?: string,
) {
  if (!name) {
    return
  }

  const specialtyWithSameName = await repository.findByName(name)

  if (
    specialtyWithSameName &&
    specialtyWithSameName.id !== currentSpecialtyId
  ) {
    throw new AppError('Specialty name already exists', 409)
  }
}

export function createSpecialtiesService(deps: SpecialtiesServiceDeps) {
  async function listActive(): Promise<Specialty[]> {
    return await deps.specialtiesRepository.findActive()
  }

  async function getActiveById(id: string): Promise<Specialty> {
    const specialty = await deps.specialtiesRepository.findActiveById(id)

    if (!specialty) {
      throw new AppError('Specialty not found', 404)
    }

    return specialty
  }

  async function create(input: CreateSpecialtyInput): Promise<Specialty> {
    await ensureUniqueName(deps.specialtiesRepository, input.name)

    return await deps.specialtiesRepository.create(input)
  }

  async function update(
    id: string,
    input: UpdateSpecialtyInput,
  ): Promise<Specialty> {
    const specialty = await deps.specialtiesRepository.findById(id)

    if (!specialty) {
      throw new AppError('Specialty not found', 404)
    }

    await ensureUniqueName(deps.specialtiesRepository, input.name, id)

    return await deps.specialtiesRepository.update(id, input)
  }

  async function deactivate(id: string): Promise<Specialty> {
    const specialty = await deps.specialtiesRepository.findById(id)

    if (!specialty) {
      throw new AppError('Specialty not found', 404)
    }

    if (!specialty.active) {
      return specialty
    }

    return await deps.specialtiesRepository.deactivate(id)
  }

  return {
    create,
    deactivate,
    getActiveById,
    listActive,
    update,
  }
}

export type SpecialtiesService = ReturnType<typeof createSpecialtiesService>
