import { AppError } from '../../shared/errors/app-error.js'

import type {
  DoctorProfile,
  DoctorsRepository,
  IdGenerator,
  PaginatedDoctors,
} from './doctors.ports.js'
import type {
  CreateDoctorBody,
  ListDoctorsQuery,
  UpdateDoctorBody,
} from './doctors.schemas.js'

type DoctorsServiceDeps = {
  doctorsRepository: DoctorsRepository
  idGenerator: IdGenerator
}

const temporaryDoctorPasswordHash = 'dummy-hash'

async function ensureCrmIsUnique(
  repository: DoctorsRepository,
  crm: string | undefined,
  currentDoctorId?: string,
) {
  if (!crm) {
    return
  }

  const doctorWithSameCrm = await repository.findByCrm(crm)

  if (doctorWithSameCrm && doctorWithSameCrm.id !== currentDoctorId) {
    throw new AppError('CRM already registered', 409)
  }
}

async function ensureEmailIsUnique(
  repository: DoctorsRepository,
  email: string | undefined,
  currentUserId?: string,
) {
  if (!email) {
    return
  }

  const userWithSameEmail = await repository.findUserByEmail(email)

  if (userWithSameEmail && userWithSameEmail.id !== currentUserId) {
    throw new AppError('E-mail already registered', 409)
  }
}

async function ensureActiveRelations(
  repository: DoctorsRepository,
  input: {
    specialtyId?: string | undefined
    clinicId?: string | undefined
  },
) {
  if (input.specialtyId) {
    const specialty = await repository.findActiveSpecialtyById(
      input.specialtyId,
    )

    if (!specialty) {
      throw new AppError('Specialty not found', 404)
    }
  }

  if (input.clinicId) {
    const clinic = await repository.findActiveClinicById(input.clinicId)

    if (!clinic) {
      throw new AppError('Clinic not found', 404)
    }
  }
}

export function createDoctorsService(deps: DoctorsServiceDeps) {
  async function list(input: ListDoctorsQuery): Promise<PaginatedDoctors> {
    return await deps.doctorsRepository.listActive(input)
  }

  async function getById(id: string): Promise<DoctorProfile> {
    const doctor = await deps.doctorsRepository.findActiveById(id)

    if (!doctor) {
      throw new AppError('Doctor not found', 404)
    }

    return doctor
  }

  async function create(input: CreateDoctorBody): Promise<DoctorProfile> {
    await ensureCrmIsUnique(deps.doctorsRepository, input.crm)
    await ensureEmailIsUnique(deps.doctorsRepository, input.email)
    await ensureActiveRelations(deps.doctorsRepository, input)

    return await deps.doctorsRepository.create({
      id: deps.idGenerator.randomUUID(),
      userId: deps.idGenerator.randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash: temporaryDoctorPasswordHash,
      crm: input.crm,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      specialtyId: input.specialtyId,
      clinicId: input.clinicId,
    })
  }

  async function update(
    id: string,
    input: UpdateDoctorBody,
  ): Promise<DoctorProfile> {
    const doctor = await deps.doctorsRepository.findById(id)

    if (!doctor) {
      throw new AppError('Doctor not found', 404)
    }

    await ensureCrmIsUnique(deps.doctorsRepository, input.crm, id)
    await ensureEmailIsUnique(
      deps.doctorsRepository,
      input.email,
      doctor.userId,
    )
    await ensureActiveRelations(deps.doctorsRepository, input)

    return await deps.doctorsRepository.update(id, input)
  }

  async function deactivate(id: string): Promise<DoctorProfile> {
    const doctor = await deps.doctorsRepository.findById(id)

    if (!doctor) {
      throw new AppError('Doctor not found', 404)
    }

    if (!doctor.active) {
      return doctor
    }

    return await deps.doctorsRepository.deactivate(id)
  }

  return {
    create,
    deactivate,
    getById,
    list,
    update,
  }
}

export type DoctorsService = ReturnType<typeof createDoctorsService>
