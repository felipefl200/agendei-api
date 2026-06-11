import { describe, expect, it, vi } from 'vitest'

import type {
  AuthPatient,
  AuthPatientsRepository,
  AuthTransactionContext,
  AuthTransactionManager,
  AuthUser,
  AuthUsersRepository,
  Clock,
  IdGenerator,
  PasswordHasher,
  TokenProvider,
} from './auth.ports.js'
import { createAuthService } from './auth.service.js'

const fixedNow = new Date('2026-06-10T12:00:00.000Z')

class InMemoryUsersRepository implements AuthUsersRepository {
  constructor(private readonly users: Map<string, AuthUser>) {}

  findByEmail(email: string): Promise<AuthUser | null> {
    return Promise.resolve(
      Array.from(this.users.values()).find((user) => user.email === email) ??
        null,
    )
  }

  findById(id: string): Promise<AuthUser | null> {
    return Promise.resolve(this.users.get(id) ?? null)
  }

  create(
    input: Parameters<AuthUsersRepository['create']>[0],
  ): Promise<AuthUser> {
    const user: AuthUser = {
      ...input,
      active: true,
      lastLoginAt: null,
      createdAt: fixedNow,
      updatedAt: fixedNow,
    }

    this.users.set(user.id, user)

    return Promise.resolve(user)
  }

  updateLastLoginAt(id: string, lastLoginAt: Date): Promise<AuthUser> {
    const user = this.users.get(id)

    if (!user) {
      return Promise.reject(new Error('User not found'))
    }

    const updatedUser = {
      ...user,
      lastLoginAt,
      updatedAt: lastLoginAt,
    }

    this.users.set(id, updatedUser)

    return Promise.resolve(updatedUser)
  }
}

class InMemoryPatientsRepository implements AuthPatientsRepository {
  constructor(
    private readonly patients: Map<string, AuthPatient>,
    private readonly shouldFail = false,
  ) {}

  create(
    input: Parameters<AuthPatientsRepository['create']>[0],
  ): Promise<AuthPatient> {
    if (this.shouldFail) {
      return Promise.reject(new Error('Could not create patient'))
    }

    const patient: AuthPatient = {
      ...input,
      phone: input.phone ?? null,
      birthDate: input.birthDate ?? null,
      document: input.document ?? null,
      avatarUrl: null,
      createdAt: fixedNow,
      updatedAt: fixedNow,
    }

    this.patients.set(patient.id, patient)

    return Promise.resolve(patient)
  }
}

class InMemoryTransactionManager implements AuthTransactionManager {
  public readonly runSpy = vi.fn()

  async run<T>(
    callback: (context: AuthTransactionContext) => Promise<T>,
  ): Promise<T> {
    this.runSpy()

    const usersSnapshot = new Map(this.users)
    const patientsSnapshot = new Map(this.patients)

    try {
      return await callback({
        users: new InMemoryUsersRepository(this.users),
        patients: new InMemoryPatientsRepository(
          this.patients,
          this.shouldFailPatientCreation,
        ),
      })
    } catch (error) {
      this.users.clear()
      this.patients.clear()

      for (const [id, user] of usersSnapshot) {
        this.users.set(id, user)
      }

      for (const [id, patient] of patientsSnapshot) {
        this.patients.set(id, patient)
      }

      throw error
    }
  }

  constructor(
    private readonly users: Map<string, AuthUser>,
    private readonly patients: Map<string, AuthPatient>,
    private readonly shouldFailPatientCreation = false,
  ) {}
}

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'existing-user-id',
    name: 'Maria Silva',
    email: 'maria@example.com',
    passwordHash: 'hashed:strong-password-123',
    role: 'patient',
    active: true,
    lastLoginAt: null,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    ...overrides,
  }
}

function makeSut(
  options: {
    users?: AuthUser[]
    shouldFailPatientCreation?: boolean
  } = {},
) {
  const users = new Map<string, AuthUser>(
    options.users?.map((user) => [user.id, user] as const),
  )
  const patients = new Map<string, AuthPatient>()
  const usersRepository = new InMemoryUsersRepository(users)
  const transactionManager = new InMemoryTransactionManager(
    users,
    patients,
    options.shouldFailPatientCreation,
  )
  const passwordHasher: PasswordHasher = {
    hash: vi.fn((password) => Promise.resolve(`hashed:${password}`)),
    verify: vi.fn((passwordHash, password) => {
      return Promise.resolve(passwordHash === `hashed:${password}`)
    }),
  }
  const tokenProvider: TokenProvider = {
    sign: vi.fn(
      (payload: { sub: string; role: string }) =>
        `token:${payload.sub}:${payload.role}`,
    ),
    verify: vi.fn(),
  }
  const ids = ['new-user-id', 'new-patient-id']
  const idGenerator: IdGenerator = {
    randomUUID: vi.fn(() => ids.shift() ?? 'fallback-id'),
  }
  const clock: Clock = {
    now: vi.fn(() => fixedNow),
  }

  return {
    service: createAuthService({
      usersRepository,
      transactionManager,
      passwordHasher,
      tokenProvider,
      idGenerator,
      clock,
    }),
    users,
    patients,
    transactionManager,
    passwordHasher,
    tokenProvider,
    clock,
  }
}

describe('auth service', () => {
  it('registers a patient account and never returns passwordHash', async () => {
    const { service, users, patients, tokenProvider } = makeSut()

    const response = await service.registerPatient({
      name: 'Maria Silva',
      email: 'maria@example.com',
      password: 'strong-password-123',
      phone: '11999999999',
    })

    expect(users.get('new-user-id')).toMatchObject({
      email: 'maria@example.com',
      role: 'patient',
      passwordHash: 'hashed:strong-password-123',
    })
    expect(patients.get('new-patient-id')).toMatchObject({
      userId: 'new-user-id',
      phone: '11999999999',
    })
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(tokenProvider.sign).toHaveBeenCalledWith({
      sub: 'new-user-id',
      role: 'patient',
    })
    expect(response.token).toBe('token:new-user-id:patient')
    expect(JSON.stringify(response)).not.toContain('passwordHash')
  })

  it('rejects duplicated e-mails before hashing, transaction, and token generation', async () => {
    const { service, transactionManager, passwordHasher, tokenProvider } =
      makeSut({
        users: [makeUser()],
      })

    await expect(
      service.registerPatient({
        name: 'Maria Silva',
        email: 'maria@example.com',
        password: 'strong-password-123',
      }),
    ).rejects.toMatchObject({
      message: 'E-mail already registered',
      statusCode: 409,
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(passwordHasher.hash).not.toHaveBeenCalled()
    expect(transactionManager.runSpy).not.toHaveBeenCalled()
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(tokenProvider.sign).not.toHaveBeenCalled()
  })

  it('rolls back user creation when patient creation fails', async () => {
    const { service, users, patients } = makeSut({
      shouldFailPatientCreation: true,
    })

    await expect(
      service.registerPatient({
        name: 'Maria Silva',
        email: 'maria@example.com',
        password: 'strong-password-123',
      }),
    ).rejects.toThrow('Could not create patient')

    expect(users.has('new-user-id')).toBe(false)
    expect(patients.size).toBe(0)
  })

  it('rejects login for unknown e-mails', async () => {
    const { service } = makeSut()

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'strong-password-123',
      }),
    ).rejects.toMatchObject({
      message: 'Invalid credentials',
      statusCode: 401,
    })
  })

  it('rejects login for invalid passwords', async () => {
    const { service } = makeSut({
      users: [makeUser()],
    })

    await expect(
      service.login({
        email: 'maria@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toMatchObject({
      message: 'Invalid credentials',
      statusCode: 401,
    })
  })

  it('rejects login for inactive users', async () => {
    const { service } = makeSut({
      users: [makeUser({ active: false })],
    })

    await expect(
      service.login({
        email: 'maria@example.com',
        password: 'strong-password-123',
      }),
    ).rejects.toMatchObject({
      message: 'User is inactive',
      statusCode: 401,
    })
  })

  it('updates lastLoginAt and signs a token on valid login', async () => {
    const { service, users, tokenProvider, clock } = makeSut({
      users: [makeUser()],
    })

    const response = await service.login({
      email: 'maria@example.com',
      password: 'strong-password-123',
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(clock.now).toHaveBeenCalled()
    expect(users.get('existing-user-id')?.lastLoginAt).toEqual(fixedNow)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(tokenProvider.sign).toHaveBeenCalledWith({
      sub: 'existing-user-id',
      role: 'patient',
    })
    expect(response.user.lastLoginAt).toEqual(fixedNow)
    expect(JSON.stringify(response)).not.toContain('passwordHash')
  })

  it('returns authenticated users without passwordHash', async () => {
    const { service } = makeSut({
      users: [makeUser()],
    })

    const user = await service.getAuthenticatedUser('existing-user-id')

    expect(user).toMatchObject({
      id: 'existing-user-id',
      email: 'maria@example.com',
    })
    expect(JSON.stringify(user)).not.toContain('passwordHash')
  })

  it('rejects authenticated lookup for missing or inactive users', async () => {
    const { service } = makeSut({
      users: [makeUser({ active: false })],
    })

    await expect(
      service.getAuthenticatedUser('missing-user-id'),
    ).rejects.toMatchObject({
      message: 'Invalid token',
      statusCode: 401,
    })

    await expect(
      service.getAuthenticatedUser('existing-user-id'),
    ).rejects.toMatchObject({
      message: 'Invalid token',
      statusCode: 401,
    })
  })
})
