import { AppError } from '../../shared/errors/app-error.js'

import type {
  AuthPatient,
  AuthTransactionManager,
  AuthUser,
  AuthUsersRepository,
  Clock,
  IdGenerator,
  PasswordHasher,
  SafeAuthUser,
  TokenProvider,
} from './auth.ports.js'
import type { LoginInput, RegisterPatientInput } from './auth.schemas.js'

type AuthServiceDeps = {
  usersRepository: AuthUsersRepository
  transactionManager: AuthTransactionManager
  passwordHasher: PasswordHasher
  tokenProvider: TokenProvider
  idGenerator: IdGenerator
  clock: Clock
}

type AuthResponse = {
  user: SafeAuthUser
  token: string
}

type RegisterPatientResponse = AuthResponse & {
  patient: AuthPatient
}

function sanitizeUser({
  passwordHash: _passwordHash,
  ...user
}: AuthUser): SafeAuthUser {
  return user
}

export function createAuthService(deps: AuthServiceDeps) {
  async function registerPatient(
    input: RegisterPatientInput,
  ): Promise<RegisterPatientResponse> {
    const existingUser = await deps.usersRepository.findByEmail(input.email)

    if (existingUser) {
      throw new AppError('E-mail already registered', 409)
    }

    const userId = deps.idGenerator.randomUUID()
    const patientId = deps.idGenerator.randomUUID()
    const passwordHash = await deps.passwordHasher.hash(input.password)

    const { createdUser, createdPatient } = await deps.transactionManager.run(
      async (tx) => {
        const createdUser = await tx.users.create({
          id: userId,
          name: input.name,
          email: input.email,
          passwordHash,
          role: 'patient',
        })

        const createdPatient = await tx.patients.create({
          id: patientId,
          userId,
          phone: input.phone,
          birthDate: input.birthDate,
          document: input.document,
        })

        return { createdUser, createdPatient }
      },
    )

    return {
      user: sanitizeUser(createdUser),
      patient: createdPatient,
      token: deps.tokenProvider.sign({
        sub: createdUser.id,
        role: createdUser.role,
      }),
    }
  }

  async function login(input: LoginInput): Promise<AuthResponse> {
    const user = await deps.usersRepository.findByEmail(input.email)

    if (!user) {
      throw new AppError('Invalid credentials', 401)
    }

    const passwordMatches = await deps.passwordHasher.verify(
      user.passwordHash,
      input.password,
    )

    if (!passwordMatches) {
      throw new AppError('Invalid credentials', 401)
    }

    if (!user.active) {
      throw new AppError('User is inactive', 401)
    }

    const lastLoginAt = deps.clock.now()
    const updatedUser = await deps.usersRepository.updateLastLoginAt(
      user.id,
      lastLoginAt,
    )

    return {
      user: sanitizeUser(updatedUser),
      token: deps.tokenProvider.sign({
        sub: user.id,
        role: user.role,
      }),
    }
  }

  async function getAuthenticatedUser(id: string): Promise<SafeAuthUser> {
    const user = await deps.usersRepository.findById(id)

    if (!user || !user.active) {
      throw new AppError('Invalid token', 401)
    }

    return sanitizeUser(user)
  }

  return {
    getAuthenticatedUser,
    login,
    registerPatient,
  }
}

export type AuthService = ReturnType<typeof createAuthService>
