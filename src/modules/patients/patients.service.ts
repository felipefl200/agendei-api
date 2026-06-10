import { AppError } from '../../shared/errors/app-error.js'

import type {
  Patient,
  PatientProfile,
  PatientUser,
  PatientsRepository,
  PatientsTransactionManager,
  PatientsUsersRepository,
} from './patients.ports.js'
import type { UpdatePatientProfileInput } from './patients.schemas.js'

type PatientsServiceDeps = {
  usersRepository: PatientsUsersRepository
  patientsRepository: PatientsRepository
  transactionManager: PatientsTransactionManager
}

function toPatientProfile(
  user: PatientUser,
  patient: Patient,
): PatientProfile {
  return {
    id: patient.id,
    name: user.name,
    email: user.email,
    phone: patient.phone,
    birthDate: patient.birthDate,
    document: patient.document,
    avatarUrl: patient.avatarUrl,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  }
}

export function createPatientsService(deps: PatientsServiceDeps) {
  async function getAuthenticatedPatient(userId: string) {
    const user = await deps.usersRepository.findById(userId)

    if (!user || !user.active) {
      throw new AppError('Invalid token', 401)
    }

    const patient = await deps.patientsRepository.findByUserId(userId)

    if (!patient) {
      throw new AppError('Patient profile not found', 404)
    }

    return {
      user,
      patient,
    }
  }

  async function getMe(userId: string): Promise<PatientProfile> {
    const { user, patient } = await getAuthenticatedPatient(userId)

    return toPatientProfile(user, patient)
  }

  async function updateMe(
    userId: string,
    input: UpdatePatientProfileInput,
  ): Promise<PatientProfile> {
    const { user, patient } = await getAuthenticatedPatient(userId)

    return await deps.transactionManager.run(async (tx) => {
      const updatedUser =
        input.name === undefined
          ? user
          : await tx.users.updateName(user.id, input.name)

      const updatedPatient = Object.hasOwn(input, 'phone')
        ? await tx.patients.updatePhone(patient.id, input.phone ?? null)
        : patient

      return toPatientProfile(updatedUser, updatedPatient)
    })
  }

  return {
    getMe,
    updateMe,
  }
}

export type PatientsService = ReturnType<typeof createPatientsService>
