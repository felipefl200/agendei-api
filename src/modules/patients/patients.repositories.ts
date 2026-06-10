import { eq } from 'drizzle-orm'

import { db } from '../../shared/database/index.js'
import { patients, users } from '../../shared/database/schema/index.js'

import type {
  Patient,
  PatientUser,
  PatientsRepository,
  PatientsTransactionContext,
  PatientsTransactionManager,
  PatientsUsersRepository,
} from './patients.ports.js'

type PatientsDatabase = typeof db
type PatientsTransaction = Parameters<
  Parameters<PatientsDatabase['transaction']>[0]
>[0]
type PatientsDatabaseClient = PatientsDatabase | PatientsTransaction

export class DrizzlePatientsUsersRepository
  implements PatientsUsersRepository
{
  constructor(private readonly client: PatientsDatabaseClient) {}

  async findById(id: string): Promise<PatientUser | null> {
    const [user] = await this.client
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        active: users.active,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return user ?? null
  }

  async updateName(id: string, name: string): Promise<PatientUser> {
    await this.client.update(users).set({ name }).where(eq(users.id, id))

    const user = await this.findById(id)

    if (!user) {
      throw new Error('Could not update user name')
    }

    return user
  }
}

export class DrizzlePatientsRepository implements PatientsRepository {
  constructor(private readonly client: PatientsDatabaseClient) {}

  async findByUserId(userId: string): Promise<Patient | null> {
    const [patient] = await this.client
      .select()
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1)

    return patient ?? null
  }

  async updatePhone(id: string, phone: string | null): Promise<Patient> {
    await this.client.update(patients).set({ phone }).where(eq(patients.id, id))

    const [patient] = await this.client
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1)

    if (!patient) {
      throw new Error('Could not update patient phone')
    }

    return patient
  }
}

export class DrizzlePatientsTransactionManager
  implements PatientsTransactionManager
{
  run<T>(
    callback: (context: PatientsTransactionContext) => Promise<T>,
  ): Promise<T> {
    return db.transaction((tx) =>
      callback({
        users: new DrizzlePatientsUsersRepository(tx),
        patients: new DrizzlePatientsRepository(tx),
      }),
    )
  }
}
