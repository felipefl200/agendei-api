import { eq } from 'drizzle-orm'
import jwt, { type SignOptions } from 'jsonwebtoken'

import { env } from '../../config/env.js'
import { db } from '../../shared/database/index.js'
import { patients, users } from '../../shared/database/schema/index.js'
import { AppError } from '../../shared/errors/app-error.js'

import type { LoginInput, RegisterPatientInput } from './auth.schemas.js'
import type { JwtPayload } from './auth.types.js'
import { hashPassword, verifyPassword } from './password.js'

const jwtExpiresIn = env.JWT_EXPIRES_IN as NonNullable<
  SignOptions['expiresIn']
>

const jwtOptions: SignOptions = {
  expiresIn: jwtExpiresIn,
}

type User = typeof users.$inferSelect
type Patient = typeof patients.$inferSelect

type SafeUser = Omit<User, 'passwordHash'>

type AuthResponse = {
  user: SafeUser
  token: string
}

type RegisterPatientResponse = AuthResponse & {
  patient: Patient
}

function sanitizeUser({ passwordHash: _passwordHash, ...user }: User): SafeUser {
  return user
}

function generateToken(user: Pick<User, 'id' | 'role'>): string {
  const payload: JwtPayload = {
    sub: user.id,
    role: user.role,
  }

  return jwt.sign(payload, env.JWT_SECRET, jwtOptions)
}

async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  return user ?? null
}

async function findUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)

  return user ?? null
}

export async function registerPatient(
  input: RegisterPatientInput,
): Promise<RegisterPatientResponse> {
  const existingUser = await findUserByEmail(input.email)

  if (existingUser) {
    throw new AppError('E-mail already registered', 409)
  }

  const userId = crypto.randomUUID()
  const patientId = crypto.randomUUID()
  const passwordHash = await hashPassword(input.password)

  const [createdUser, createdPatient] = await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'patient',
    })

    await tx.insert(patients).values({
      id: patientId,
      userId,
      phone: input.phone,
      birthDate: input.birthDate,
      document: input.document,
    })

    const [user] = await tx.select().from(users).where(eq(users.id, userId))

    const [patient] = await tx
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))

    if (!user || !patient) {
      throw new AppError('Could not create patient account', 500)
    }

    return [user, patient]
  })

  return {
    user: sanitizeUser(createdUser),
    patient: createdPatient,
    token: generateToken(createdUser),
  }
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await findUserByEmail(input.email)

  if (!user) {
    throw new AppError('Invalid credentials', 401)
  }

  const passwordMatches = await verifyPassword(user.passwordHash, input.password)

  if (!passwordMatches) {
    throw new AppError('Invalid credentials', 401)
  }

  if (!user.active) {
    throw new AppError('User is inactive', 401)
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id))

  return {
    user: sanitizeUser({
      ...user,
      lastLoginAt: new Date(),
    }),
    token: generateToken(user),
  }
}

export async function getAuthenticatedUser(id: string): Promise<SafeUser> {
  const user = await findUserById(id)

  if (!user || !user.active) {
    throw new AppError('Invalid token', 401)
  }

  return sanitizeUser(user)
}
