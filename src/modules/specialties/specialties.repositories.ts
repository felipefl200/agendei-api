import { and, asc, eq } from 'drizzle-orm'

import { db } from '../../shared/database/index.js'
import { specialties } from '../../shared/database/schema/index.js'

import type {
  CreateSpecialtyInput,
  SpecialtiesRepository,
  Specialty,
  UpdateSpecialtyInput,
} from './specialties.ports.js'

export class DrizzleSpecialtiesRepository implements SpecialtiesRepository {
  async findActive(): Promise<Specialty[]> {
    return await db
      .select()
      .from(specialties)
      .where(eq(specialties.active, true))
      .orderBy(asc(specialties.name))
  }

  async findActiveById(id: string): Promise<Specialty | null> {
    const [specialty] = await db
      .select()
      .from(specialties)
      .where(and(eq(specialties.id, id), eq(specialties.active, true)))
      .limit(1)

    return specialty ?? null
  }

  async findById(id: string): Promise<Specialty | null> {
    const [specialty] = await db
      .select()
      .from(specialties)
      .where(eq(specialties.id, id))
      .limit(1)

    return specialty ?? null
  }

  async findByName(name: string): Promise<Specialty | null> {
    const [specialty] = await db
      .select()
      .from(specialties)
      .where(eq(specialties.name, name))
      .limit(1)

    return specialty ?? null
  }

  async create(input: CreateSpecialtyInput): Promise<Specialty> {
    await db.insert(specialties).values({
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
    })

    const specialty = await this.findByName(input.name)

    if (!specialty) {
      throw new Error('Could not create specialty')
    }

    return specialty
  }

  async update(id: string, input: UpdateSpecialtyInput): Promise<Specialty> {
    await db
      .update(specialties)
      .set({
        ...input,
        description:
          input.description === undefined ? undefined : input.description,
        icon: input.icon === undefined ? undefined : input.icon,
      })
      .where(eq(specialties.id, id))

    const specialty = await this.findById(id)

    if (!specialty) {
      throw new Error('Could not update specialty')
    }

    return specialty
  }

  async deactivate(id: string): Promise<Specialty> {
    await db
      .update(specialties)
      .set({ active: false })
      .where(eq(specialties.id, id))

    const specialty = await this.findById(id)

    if (!specialty) {
      throw new Error('Could not deactivate specialty')
    }

    return specialty
  }
}
