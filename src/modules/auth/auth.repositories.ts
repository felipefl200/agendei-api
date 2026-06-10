import { eq } from 'drizzle-orm'

import { db } from '../../shared/database/index.js'
import { patients, users } from '../../shared/database/schema/index.js'

import type {
  AuthPatient,
  AuthPatientsRepository,
  AuthTransactionContext,
  AuthTransactionManager,
  AuthUser,
  AuthUsersRepository,
  CreateAuthPatientInput,
  CreateAuthUserInput,
} from './auth.ports.js'

type AuthDatabase = typeof db
type AuthTransaction = Parameters<Parameters<AuthDatabase['transaction']>[0]>[0]
type AuthDatabaseClient = AuthDatabase | AuthTransaction

export class DrizzleAuthUsersRepository implements AuthUsersRepository {
  constructor(private readonly client: AuthDatabaseClient) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    const [user] = await this.client
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return user ?? null
  }

  async findById(id: string): Promise<AuthUser | null> {
    const [user] = await this.client
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return user ?? null
  }

  async create(input: CreateAuthUserInput): Promise<AuthUser> {
    await this.client.insert(users).values(input)

    const user = await this.findById(input.id)

    if (!user) {
      throw new Error('Could not create user')
    }

    return user
  }

  async updateLastLoginAt(id: string, lastLoginAt: Date): Promise<AuthUser> {
    await this.client
      .update(users)
      .set({ lastLoginAt })
      .where(eq(users.id, id))

    const user = await this.findById(id)

    if (!user) {
      throw new Error('Could not update user last login')
    }

    return user
  }
}

export class DrizzleAuthPatientsRepository implements AuthPatientsRepository {
  constructor(private readonly client: AuthDatabaseClient) {}

  async create(input: CreateAuthPatientInput): Promise<AuthPatient> {
    await this.client.insert(patients).values(input)

    const [patient] = await this.client
      .select()
      .from(patients)
      .where(eq(patients.id, input.id))
      .limit(1)

    if (!patient) {
      throw new Error('Could not create patient')
    }

    return patient
  }
}

export class DrizzleAuthTransactionManager implements AuthTransactionManager {
  run<T>(callback: (context: AuthTransactionContext) => Promise<T>): Promise<T> {
    return db.transaction((tx) =>
      callback({
        users: new DrizzleAuthUsersRepository(tx),
        patients: new DrizzleAuthPatientsRepository(tx),
      }),
    )
  }
}
