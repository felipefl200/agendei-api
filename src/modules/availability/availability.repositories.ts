import { and, asc, eq, inArray } from 'drizzle-orm'

import { db } from '../../shared/database/index.js'
import {
  appointments,
  clinics,
  doctorAvailabilities,
  doctorClinics,
  doctors,
} from '../../shared/database/schema/index.js'

import type {
  AvailabilityRepository,
  AvailabilityRule,
  CreateAvailabilityRuleInput,
  UpdateAvailabilityRuleInput,
} from './availability.ports.js'
import {
  normalizeTimeForApi,
  normalizeTimeForDatabase,
} from './availability.time.js'

type DoctorAvailabilityRow = typeof doctorAvailabilities.$inferSelect

function toAvailabilityRule(row: DoctorAvailabilityRow): AvailabilityRule {
  return {
    id: row.id,
    doctorId: row.doctorId,
    clinicId: row.clinicId,
    weekday: row.weekday,
    startTime: normalizeTimeForApi(row.startTime),
    endTime: normalizeTimeForApi(row.endTime),
    slotDurationInMinutes: row.slotDurationMinutes,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export class DrizzleAvailabilityRepository implements AvailabilityRepository {
  async findActiveDoctorById(id: string): Promise<{ id: string } | null> {
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(and(eq(doctors.id, id), eq(doctors.active, true)))
      .limit(1)

    return doctor ?? null
  }

  async findActiveClinicById(id: string): Promise<{ id: string } | null> {
    const [clinic] = await db
      .select({ id: clinics.id })
      .from(clinics)
      .where(and(eq(clinics.id, id), eq(clinics.active, true)))
      .limit(1)

    return clinic ?? null
  }

  async findActiveDoctorClinic(
    doctorId: string,
    clinicId: string,
  ): Promise<{ id: string } | null> {
    const [doctorClinic] = await db
      .select({ id: doctorClinics.id })
      .from(doctorClinics)
      .where(
        and(
          eq(doctorClinics.doctorId, doctorId),
          eq(doctorClinics.clinicId, clinicId),
          eq(doctorClinics.active, true),
        ),
      )
      .limit(1)

    return doctorClinic ?? null
  }

  async findActiveRulesForDoctorClinicAndWeekday(input: {
    doctorId: string
    clinicId: string
    weekday: number
  }): Promise<AvailabilityRule[]> {
    const rows = await db
      .select()
      .from(doctorAvailabilities)
      .where(
        and(
          eq(doctorAvailabilities.doctorId, input.doctorId),
          eq(doctorAvailabilities.clinicId, input.clinicId),
          eq(doctorAvailabilities.weekday, input.weekday),
          eq(doctorAvailabilities.active, true),
        ),
      )
      .orderBy(asc(doctorAvailabilities.startTime))

    return rows.map(toAvailabilityRule)
  }

  async findOccupiedStartTimes(input: {
    doctorId: string
    clinicId: string
    date: Date
  }): Promise<string[]> {
    const rows = await db
      .select({ startTime: appointments.startTime })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, input.doctorId),
          eq(appointments.clinicId, input.clinicId),
          eq(appointments.date, input.date),
          inArray(appointments.status, ['scheduled', 'confirmed']),
        ),
      )

    return rows.map((row) => row.startTime)
  }

  async listByDoctorId(doctorId: string): Promise<AvailabilityRule[]> {
    const rows = await db
      .select()
      .from(doctorAvailabilities)
      .where(eq(doctorAvailabilities.doctorId, doctorId))
      .orderBy(
        asc(doctorAvailabilities.weekday),
        asc(doctorAvailabilities.startTime),
      )

    return rows.map(toAvailabilityRule)
  }

  async findById(id: string): Promise<AvailabilityRule | null> {
    const [row] = await db
      .select()
      .from(doctorAvailabilities)
      .where(eq(doctorAvailabilities.id, id))
      .limit(1)

    return row ? toAvailabilityRule(row) : null
  }

  async create(input: CreateAvailabilityRuleInput): Promise<AvailabilityRule> {
    await db.insert(doctorAvailabilities).values({
      id: input.id,
      doctorId: input.doctorId,
      clinicId: input.clinicId,
      weekday: input.weekday,
      startTime: normalizeTimeForDatabase(input.startTime),
      endTime: normalizeTimeForDatabase(input.endTime),
      slotDurationMinutes: input.slotDurationInMinutes,
    })

    const availability = await this.findById(input.id)

    if (!availability) {
      throw new Error('Could not create availability')
    }

    return availability
  }

  async update(
    id: string,
    input: UpdateAvailabilityRuleInput,
  ): Promise<AvailabilityRule> {
    const updateInput: {
      clinicId?: string
      weekday?: number
      startTime?: string
      endTime?: string
      slotDurationMinutes?: number
    } = {}

    if (input.clinicId !== undefined) {
      updateInput.clinicId = input.clinicId
    }

    if (input.weekday !== undefined) {
      updateInput.weekday = input.weekday
    }

    if (input.startTime !== undefined) {
      updateInput.startTime = normalizeTimeForDatabase(input.startTime)
    }

    if (input.endTime !== undefined) {
      updateInput.endTime = normalizeTimeForDatabase(input.endTime)
    }

    if (input.slotDurationInMinutes !== undefined) {
      updateInput.slotDurationMinutes = input.slotDurationInMinutes
    }

    await db
      .update(doctorAvailabilities)
      .set(updateInput)
      .where(eq(doctorAvailabilities.id, id))

    const availability = await this.findById(id)

    if (!availability) {
      throw new Error('Could not update availability')
    }

    return availability
  }

  async deactivate(id: string): Promise<AvailabilityRule> {
    await db
      .update(doctorAvailabilities)
      .set({ active: false })
      .where(eq(doctorAvailabilities.id, id))

    const availability = await this.findById(id)

    if (!availability) {
      throw new Error('Could not deactivate availability')
    }

    return availability
  }
}
