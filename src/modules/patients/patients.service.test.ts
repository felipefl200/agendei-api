import { describe, expect, it, vi } from 'vitest'

import type {
  Patient,
  PatientUser,
  PatientsRepository,
  PatientsTransactionContext,
  PatientsTransactionManager,
  PatientsUsersRepository,
} from './patients.ports.js'
import { createPatientsService } from './patients.service.js'

const fixedNow = new Date('2026-06-10T12:00:00.000Z')

class InMemoryPatientsUsersRepository implements PatientsUsersRepository {
  constructor(private readonly users: Map<string, PatientUser>) {}

  async findById(id: string): Promise<PatientUser | null> {
    return this.users.get(id) ?? null
  }

  async updateName(id: string, name: string): Promise<PatientUser> {
    const user = this.users.get(id)

    if (!user) {
      throw new Error('User not found')
    }

    const updatedUser = {
      ...user,
      name,
    }

    this.users.set(id, updatedUser)

    return updatedUser
  }
}

class InMemoryPatientsRepository implements PatientsRepository {
  constructor(private readonly patients: Map<string, Patient>) {}

  async findByUserId(userId: string): Promise<Patient | null> {
    return (
      Array.from(this.patients.values()).find(
        (patient) => patient.userId === userId,
      ) ?? null
    )
  }

  async updatePhone(id: string, phone: string | null): Promise<Patient> {
    const patient = this.patients.get(id)

    if (!patient) {
      throw new Error('Patient not found')
    }

    const updatedPatient = {
      ...patient,
      phone,
    }

    this.patients.set(id, updatedPatient)

    return updatedPatient
  }
}

class InMemoryPatientsTransactionManager
  implements PatientsTransactionManager
{
  public readonly runSpy = vi.fn()

  constructor(
    private readonly users: Map<string, PatientUser>,
    private readonly patients: Map<string, Patient>,
  ) {}

  async run<T>(
    callback: (context: PatientsTransactionContext) => Promise<T>,
  ): Promise<T> {
    this.runSpy()

    return await callback({
      users: new InMemoryPatientsUsersRepository(this.users),
      patients: new InMemoryPatientsRepository(this.patients),
    })
  }
}

function makeUser(overrides: Partial<PatientUser> = {}): PatientUser {
  return {
    id: 'user-id',
    name: 'Maria Silva',
    email: 'maria@example.com',
    active: true,
    ...overrides,
  }
}

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-id',
    userId: 'user-id',
    phone: '11999999999',
    birthDate: null,
    document: null,
    avatarUrl: null,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    ...overrides,
  }
}

function makeSut(options: {
  users?: PatientUser[]
  patients?: Patient[]
} = {}) {
  const users = new Map<string, PatientUser>(
    options.users?.map((user) => [user.id, user] as const) ?? [
      ['user-id', makeUser()] as const,
    ],
  )
  const patients = new Map<string, Patient>(
    options.patients?.map((patient) => [patient.id, patient] as const) ?? [
      ['patient-id', makePatient()] as const,
    ],
  )
  const usersRepository = new InMemoryPatientsUsersRepository(users)
  const patientsRepository = new InMemoryPatientsRepository(patients)
  const transactionManager = new InMemoryPatientsTransactionManager(
    users,
    patients,
  )

  return {
    service: createPatientsService({
      usersRepository,
      patientsRepository,
      transactionManager,
    }),
    users,
    patients,
    transactionManager,
  }
}

describe('patients service', () => {
  it('returns the authenticated patient profile without leaking internal fields', async () => {
    const { service } = makeSut()

    const patient = await service.getMe('user-id')

    expect(patient).toEqual({
      id: 'patient-id',
      name: 'Maria Silva',
      email: 'maria@example.com',
      phone: '11999999999',
      birthDate: null,
      document: null,
      avatarUrl: null,
      createdAt: fixedNow,
      updatedAt: fixedNow,
    })
    expect(JSON.stringify(patient)).not.toContain('userId')
    expect(JSON.stringify(patient)).not.toContain('passwordHash')
    expect(JSON.stringify(patient)).not.toContain('active')
  })

  it('updates the authenticated user name', async () => {
    const { service, users, patients, transactionManager } = makeSut()

    const patient = await service.updateMe('user-id', {
      name: 'Ana Silva',
    })

    expect(transactionManager.runSpy).toHaveBeenCalled()
    expect(users.get('user-id')?.name).toBe('Ana Silva')
    expect(patients.get('patient-id')?.phone).toBe('11999999999')
    expect(patient).toMatchObject({
      name: 'Ana Silva',
      phone: '11999999999',
    })
  })

  it('updates the authenticated patient phone', async () => {
    const { service, users, patients } = makeSut()

    const patient = await service.updateMe('user-id', {
      phone: '11888887777',
    })

    expect(users.get('user-id')?.name).toBe('Maria Silva')
    expect(patients.get('patient-id')?.phone).toBe('11888887777')
    expect(patient).toMatchObject({
      name: 'Maria Silva',
      phone: '11888887777',
    })
  })

  it('clears the authenticated patient phone', async () => {
    const { service, patients } = makeSut()

    const patient = await service.updateMe('user-id', {
      phone: null,
    })

    expect(patients.get('patient-id')?.phone).toBeNull()
    expect(patient.phone).toBeNull()
  })

  it('updates name and phone in the same transaction', async () => {
    const { service, users, patients, transactionManager } = makeSut()

    const patient = await service.updateMe('user-id', {
      name: 'Ana Silva',
      phone: '11888887777',
    })

    expect(transactionManager.runSpy).toHaveBeenCalledTimes(1)
    expect(users.get('user-id')?.name).toBe('Ana Silva')
    expect(patients.get('patient-id')?.phone).toBe('11888887777')
    expect(patient).toMatchObject({
      name: 'Ana Silva',
      phone: '11888887777',
    })
  })

  it('rejects missing or inactive users', async () => {
    const missingUserSut = makeSut({
      users: [],
      patients: [makePatient()],
    })

    await expect(missingUserSut.service.getMe('missing-user-id')).rejects.toMatchObject(
      {
        message: 'Invalid token',
        statusCode: 401,
      },
    )

    const inactiveUserSut = makeSut({
      users: [makeUser({ active: false })],
      patients: [makePatient()],
    })

    await expect(inactiveUserSut.service.getMe('user-id')).rejects.toMatchObject(
      {
        message: 'Invalid token',
        statusCode: 401,
      },
    )
  })

  it('rejects authenticated users without a patient profile', async () => {
    const { service } = makeSut({
      users: [makeUser()],
      patients: [],
    })

    await expect(service.getMe('user-id')).rejects.toMatchObject({
      message: 'Patient profile not found',
      statusCode: 404,
    })
  })
})
