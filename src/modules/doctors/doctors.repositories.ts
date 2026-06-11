import type { SQL } from 'drizzle-orm'
import { and, asc, eq, like } from 'drizzle-orm'

import { db } from '../../shared/database/index.js'
import {
  clinics,
  doctorAvailabilities,
  doctorClinics,
  doctors,
  doctorSpecialties,
  specialties,
  users,
} from '../../shared/database/schema/index.js'

import type {
  CreateDoctorInput,
  DoctorProfile,
  DoctorRecord,
  DoctorsRepository,
  ListDoctorsInput,
  PaginatedDoctors,
  UpdateDoctorInput,
} from './doctors.ports.js'

type DoctorRow = {
  id: string
  userId: string
  name: string
  email: string
  crm: string
  bio: string | null
  avatarUrl: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
  specialtyId: string
  specialtyName: string
  clinicId: string
  clinicName: string
  clinicAddress: string | null
  availabilityId: string | null
}

function todayWeekday() {
  return new Date().getDay()
}

function toDoctorProfiles(rows: DoctorRow[]): DoctorRecord[] {
  const doctorsById = new Map<string, DoctorRecord>()

  for (const row of rows) {
    const existingDoctor = doctorsById.get(row.id)

    if (existingDoctor) {
      existingDoctor.availableToday =
        existingDoctor.availableToday || row.availabilityId !== null
      continue
    }

    doctorsById.set(row.id, {
      id: row.id,
      userId: row.userId,
      name: row.name,
      email: row.email,
      crm: row.crm,
      bio: row.bio,
      avatarUrl: row.avatarUrl,
      active: row.active,
      specialty: {
        id: row.specialtyId,
        name: row.specialtyName,
      },
      clinic: {
        id: row.clinicId,
        name: row.clinicName,
        address: row.clinicAddress,
      },
      availableToday: row.availabilityId !== null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  return Array.from(doctorsById.values())
}

export class DrizzleDoctorsRepository implements DoctorsRepository {
  private async findRows(input: {
    activeOnly: boolean
    id?: string | undefined
    search?: string | undefined
    specialtyId?: string | undefined
  }): Promise<DoctorRow[]> {
    const conditions: SQL[] = []

    if (input.activeOnly) {
      conditions.push(
        eq(doctors.active, true),
        eq(users.active, true),
        eq(specialties.active, true),
        eq(doctorClinics.active, true),
        eq(clinics.active, true),
      )
    }

    if (input.id) {
      conditions.push(eq(doctors.id, input.id))
    }

    if (input.search) {
      conditions.push(like(users.name, `%${input.search}%`))
    }

    if (input.specialtyId) {
      conditions.push(eq(doctorSpecialties.specialtyId, input.specialtyId))
    }

    return await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        name: users.name,
        email: users.email,
        crm: doctors.crm,
        bio: doctors.bio,
        avatarUrl: doctors.avatarUrl,
        active: doctors.active,
        createdAt: doctors.createdAt,
        updatedAt: doctors.updatedAt,
        specialtyId: specialties.id,
        specialtyName: specialties.name,
        clinicId: clinics.id,
        clinicName: clinics.name,
        clinicAddress: clinics.address,
        availabilityId: doctorAvailabilities.id,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .innerJoin(doctorSpecialties, eq(doctorSpecialties.doctorId, doctors.id))
      .innerJoin(specialties, eq(doctorSpecialties.specialtyId, specialties.id))
      .innerJoin(doctorClinics, eq(doctorClinics.doctorId, doctors.id))
      .innerJoin(clinics, eq(doctorClinics.clinicId, clinics.id))
      .leftJoin(
        doctorAvailabilities,
        and(
          eq(doctorAvailabilities.doctorId, doctors.id),
          eq(doctorAvailabilities.clinicId, clinics.id),
          eq(doctorAvailabilities.weekday, todayWeekday()),
          eq(doctorAvailabilities.active, true),
        ),
      )
      .where(and(...conditions))
      .orderBy(asc(users.name))
  }

  async listActive(input: ListDoctorsInput): Promise<PaginatedDoctors> {
    const rows = await this.findRows({
      activeOnly: true,
      search: input.search,
      specialtyId: input.specialtyId,
    })
    const allDoctors = toDoctorProfiles(rows)
    const start = (input.page - 1) * input.perPage
    const doctorsPage = allDoctors.slice(start, start + input.perPage)
    const totalPages = Math.ceil(allDoctors.length / input.perPage)

    return {
      doctors: doctorsPage,
      pagination: {
        page: input.page,
        perPage: input.perPage,
        total: allDoctors.length,
        totalPages,
      },
    }
  }

  async findActiveById(id: string): Promise<DoctorProfile | null> {
    const [doctor] = toDoctorProfiles(
      await this.findRows({
        activeOnly: true,
        id,
      }),
    )

    return doctor ?? null
  }

  async findById(id: string): Promise<DoctorRecord | null> {
    const [doctor] = toDoctorProfiles(
      await this.findRows({
        activeOnly: false,
        id,
      }),
    )

    return doctor ?? null
  }

  async findByCrm(crm: string): Promise<DoctorRecord | null> {
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.crm, crm))
      .limit(1)

    return doctor ? await this.findById(doctor.id) : null
  }

  async findUserByEmail(email: string): Promise<{ id: string } | null> {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return user ?? null
  }

  async findActiveSpecialtyById(id: string) {
    const [specialty] = await db
      .select({
        id: specialties.id,
        name: specialties.name,
      })
      .from(specialties)
      .where(and(eq(specialties.id, id), eq(specialties.active, true)))
      .limit(1)

    return specialty ?? null
  }

  async findActiveClinicById(id: string) {
    const [clinic] = await db
      .select({
        id: clinics.id,
        name: clinics.name,
        address: clinics.address,
      })
      .from(clinics)
      .where(and(eq(clinics.id, id), eq(clinics.active, true)))
      .limit(1)

    return clinic ?? null
  }

  async create(input: CreateDoctorInput): Promise<DoctorProfile> {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: input.userId,
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: 'doctor',
      })

      await tx.insert(doctors).values({
        id: input.id,
        userId: input.userId,
        crm: input.crm,
        bio: input.bio ?? null,
        avatarUrl: input.avatarUrl ?? null,
      })

      await tx.insert(doctorSpecialties).values({
        doctorId: input.id,
        specialtyId: input.specialtyId,
      })

      await tx.insert(doctorClinics).values({
        doctorId: input.id,
        clinicId: input.clinicId,
      })
    })

    const doctor = await this.findActiveById(input.id)

    if (!doctor) {
      throw new Error('Could not create doctor')
    }

    return doctor
  }

  async update(id: string, input: UpdateDoctorInput): Promise<DoctorProfile> {
    const doctor = await this.findById(id)

    if (!doctor) {
      throw new Error('Doctor not found')
    }

    await db.transaction(async (tx) => {
      if (input.name !== undefined || input.email !== undefined) {
        const userUpdate: {
          name?: string
          email?: string
        } = {}

        if (input.name !== undefined) {
          userUpdate.name = input.name
        }

        if (input.email !== undefined) {
          userUpdate.email = input.email
        }

        await tx
          .update(users)
          .set(userUpdate)
          .where(eq(users.id, doctor.userId))
      }

      if (
        input.crm !== undefined ||
        input.bio !== undefined ||
        input.avatarUrl !== undefined
      ) {
        const doctorUpdate: {
          crm?: string
          bio?: string | null
          avatarUrl?: string | null
        } = {}

        if (input.crm !== undefined) {
          doctorUpdate.crm = input.crm
        }

        if (input.bio !== undefined) {
          doctorUpdate.bio = input.bio
        }

        if (input.avatarUrl !== undefined) {
          doctorUpdate.avatarUrl = input.avatarUrl
        }

        await tx.update(doctors).set(doctorUpdate).where(eq(doctors.id, id))
      }

      if (input.specialtyId !== undefined) {
        await tx
          .update(doctorSpecialties)
          .set({ specialtyId: input.specialtyId })
          .where(eq(doctorSpecialties.doctorId, id))
      }

      if (input.clinicId !== undefined) {
        await tx
          .update(doctorClinics)
          .set({
            clinicId: input.clinicId,
            active: true,
          })
          .where(eq(doctorClinics.doctorId, id))
      }
    })

    const updatedDoctor = await this.findById(id)

    if (!updatedDoctor) {
      throw new Error('Could not update doctor')
    }

    return updatedDoctor
  }

  async deactivate(id: string): Promise<DoctorProfile> {
    await db.update(doctors).set({ active: false }).where(eq(doctors.id, id))

    const doctor = await this.findById(id)

    if (!doctor) {
      throw new Error('Could not deactivate doctor')
    }

    return doctor
  }
}
