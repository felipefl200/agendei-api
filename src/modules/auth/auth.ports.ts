import type { JwtPayload, UserRole } from './auth.types.js'

export type AuthUser = {
  id: string
  name: string
  email: string
  passwordHash: string
  role: UserRole
  active: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type SafeAuthUser = Omit<AuthUser, 'passwordHash'>

export type AuthPatient = {
  id: string
  userId: string
  phone: string | null
  birthDate: Date | null
  document: string | null
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateAuthUserInput = {
  id: string
  name: string
  email: string
  passwordHash: string
  role: UserRole
}

export type CreateAuthPatientInput = {
  id: string
  userId: string
  phone?: string | undefined
  birthDate?: Date | undefined
  document?: string | undefined
}

export type AuthUsersRepository = {
  findByEmail(email: string): Promise<AuthUser | null>
  findById(id: string): Promise<AuthUser | null>
  create(input: CreateAuthUserInput): Promise<AuthUser>
  updateLastLoginAt(id: string, lastLoginAt: Date): Promise<AuthUser>
}

export type AuthPatientsRepository = {
  create(input: CreateAuthPatientInput): Promise<AuthPatient>
}

export type AuthTransactionContext = {
  users: AuthUsersRepository
  patients: AuthPatientsRepository
}

export type AuthTransactionManager = {
  run<T>(callback: (context: AuthTransactionContext) => Promise<T>): Promise<T>
}

export type PasswordHasher = {
  hash(password: string): Promise<string>
  verify(passwordHash: string, password: string): Promise<boolean>
}

export type TokenProvider = {
  sign(payload: JwtPayload): string
  verify(token: string): JwtPayload
}

export type IdGenerator = {
  randomUUID(): string
}

export type Clock = {
  now(): Date
}
