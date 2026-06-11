import { and, asc, desc, eq, inArray } from 'drizzle-orm'

import { db } from '../../shared/database/index.js'
import {
  appointments,
  clinics,
  doctorAvailabilities,
  doctorClinics,
  doctors,
  doctorSpecialties,
  patients,
  specialties,
  users,
} from '../../shared/database/schema/index.js'
import {
  normalizeTimeForApi,
  normalizeTimeForDatabase,
} from '../availability/availability.time.js'

import type {
  AppointmentConflictInput,
  AppointmentsRepository,
  AppointmentSummary,
  AvailabilityRule,
  CompactAppointmentSummary,
  CreateAppointmentInput,
  PatientRecord,
} from './appointments.ports.js'
import type { AppointmentStatus } from './appointments.types.js'

const blockingAppointmentStatuses: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
]
const upcomingAppointmentStatuses: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
]
const historyAppointmentStatuses: AppointmentStatus[] = [
  'completed',
  'canceled',
  'no_show',
]

type AppointmentsDatabase = typeof db
type AppointmentsTransaction = Parameters<
  Parameters<AppointmentsDatabase['transaction']>[0]
>[0]
type AppointmentsDatabaseClient = AppointmentsDatabase | AppointmentsTransaction

type AppointmentRow = {
  id: string
  doctorId: string
  doctorName: string
  specialtyId: string
  specialtyName: string
  clinicId: string
  clinicName: string
  date: Date | string
  startTime: string
  endTime: string
  status: AppointmentStatus
}

function normalizeDateForApi(date: Date | string) {
  return date instanceof Date ? date.toISOString().slice(0, 10) : date
}

function toAppointmentSummary(row: AppointmentRow): AppointmentSummary {
  return {
    id: row.id,
    doctor: {
      id: row.doctorId,
      name: row.doctorName,
    },
    specialty: {
      id: row.specialtyId,
      name: row.specialtyName,
    },
    clinic: {
      id: row.clinicId,
      name: row.clinicName,
    },
    date: normalizeDateForApi(row.date),
    startTime: normalizeTimeForApi(row.startTime),
    endTime: normalizeTimeForApi(row.endTime),
    status: row.status,
  }
}

function toCompactAppointmentSummary(
  row: Omit<
    AppointmentRow,
    'doctorId' | 'specialtyId' | 'clinicId' | 'endTime'
  >,
): CompactAppointmentSummary {
  return {
    id: row.id,
    doctorName: row.doctorName,
    specialtyName: row.specialtyName,
    clinicName: row.clinicName,
    date: normalizeDateForApi(row.date),
    startTime: normalizeTimeForApi(row.startTime),
    status: row.status,
  }
}

async function hasDoctorConflictWithClient(
  client: AppointmentsDatabaseClient,
  input: AppointmentConflictInput,
) {
  const [appointment] = await client
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, input.doctorId),
        eq(appointments.date, input.date),
        eq(appointments.startTime, normalizeTimeForDatabase(input.startTime)),
        inArray(appointments.status, blockingAppointmentStatuses),
      ),
    )
    .limit(1)

  return appointment !== undefined
}

async function hasPatientConflictWithClient(
  client: AppointmentsDatabaseClient,
  input: AppointmentConflictInput,
) {
  const [appointment] = await client
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, input.patientId),
        eq(appointments.date, input.date),
        eq(appointments.startTime, normalizeTimeForDatabase(input.startTime)),
        inArray(appointments.status, blockingAppointmentStatuses),
      ),
    )
    .limit(1)

  return appointment !== undefined
}

export class DrizzleAppointmentsRepository implements AppointmentsRepository {
  async findActivePatientByUserId(
    userId: string,
  ): Promise<PatientRecord | null> {
    const [patient] = await db
      .select({
        id: patients.id,
        userId: patients.userId,
      })
      .from(patients)
      .innerJoin(users, eq(patients.userId, users.id))
      .where(and(eq(patients.userId, userId), eq(users.active, true)))
      .limit(1)

    return patient ?? null
  }

  async findActiveDoctorById(id: string): Promise<{ id: string } | null> {
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(
        and(
          eq(doctors.id, id),
          eq(doctors.active, true),
          eq(users.active, true),
        ),
      )
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

  async findActiveSpecialtyById(id: string): Promise<{ id: string } | null> {
    const [specialty] = await db
      .select({ id: specialties.id })
      .from(specialties)
      .where(and(eq(specialties.id, id), eq(specialties.active, true)))
      .limit(1)

    return specialty ?? null
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

  async findActiveDoctorSpecialty(
    doctorId: string,
    specialtyId: string,
  ): Promise<{ id: string } | null> {
    const [doctorSpecialty] = await db
      .select({ id: doctorSpecialties.id })
      .from(doctorSpecialties)
      .where(
        and(
          eq(doctorSpecialties.doctorId, doctorId),
          eq(doctorSpecialties.specialtyId, specialtyId),
        ),
      )
      .limit(1)

    return doctorSpecialty ?? null
  }

  async findActiveAvailabilityRules(input: {
    doctorId: string
    clinicId: string
    weekday: number
  }): Promise<AvailabilityRule[]> {
    const rows = await db
      .select({
        startTime: doctorAvailabilities.startTime,
        endTime: doctorAvailabilities.endTime,
        slotDurationInMinutes: doctorAvailabilities.slotDurationMinutes,
      })
      .from(doctorAvailabilities)
      .where(
        and(
          eq(doctorAvailabilities.doctorId, input.doctorId),
          eq(doctorAvailabilities.clinicId, input.clinicId),
          eq(doctorAvailabilities.weekday, input.weekday),
          eq(doctorAvailabilities.active, true),
        ),
      )

    return rows.map((row) => ({
      startTime: normalizeTimeForApi(row.startTime),
      endTime: normalizeTimeForApi(row.endTime),
      slotDurationInMinutes: row.slotDurationInMinutes,
    }))
  }

  async hasDoctorConflict(input: AppointmentConflictInput): Promise<boolean> {
    return await hasDoctorConflictWithClient(db, input)
  }

  async hasPatientConflict(input: AppointmentConflictInput): Promise<boolean> {
    return await hasPatientConflictWithClient(db, input)
  }

  async create(
    input: CreateAppointmentInput,
  ): Promise<AppointmentSummary | null> {
    const created = await db.transaction(async (tx) => {
      if (await hasDoctorConflictWithClient(tx, input)) {
        return false
      }

      if (await hasPatientConflictWithClient(tx, input)) {
        return false
      }

      await tx.insert(appointments).values({
        id: input.id,
        patientId: input.patientId,
        doctorId: input.doctorId,
        clinicId: input.clinicId,
        specialtyId: input.specialtyId,
        date: input.date,
        startTime: normalizeTimeForDatabase(input.startTime),
        endTime: normalizeTimeForDatabase(input.endTime),
        status: 'scheduled',
        createdByUserId: input.createdByUserId,
      })

      return true
    })

    if (!created) {
      return null
    }

    return await this.findByIdForPatient({
      id: input.id,
      patientId: input.patientId,
    })
  }

  async findByIdForPatient(input: {
    id: string
    patientId: string
  }): Promise<AppointmentSummary | null> {
    const [appointment] = await db
      .select({
        id: appointments.id,
        doctorId: appointments.doctorId,
        doctorName: users.name,
        specialtyId: appointments.specialtyId,
        specialtyName: specialties.name,
        clinicId: appointments.clinicId,
        clinicName: clinics.name,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(users, eq(doctors.userId, users.id))
      .innerJoin(specialties, eq(appointments.specialtyId, specialties.id))
      .innerJoin(clinics, eq(appointments.clinicId, clinics.id))
      .where(
        and(
          eq(appointments.id, input.id),
          eq(appointments.patientId, input.patientId),
        ),
      )
      .limit(1)

    return appointment ? toAppointmentSummary(appointment) : null
  }

  async findUpcomingByPatientId(
    patientId: string,
  ): Promise<CompactAppointmentSummary[]> {
    const rows = await db
      .select({
        id: appointments.id,
        doctorName: users.name,
        specialtyName: specialties.name,
        clinicName: clinics.name,
        date: appointments.date,
        startTime: appointments.startTime,
        status: appointments.status,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(users, eq(doctors.userId, users.id))
      .innerJoin(specialties, eq(appointments.specialtyId, specialties.id))
      .innerJoin(clinics, eq(appointments.clinicId, clinics.id))
      .where(
        and(
          eq(appointments.patientId, patientId),
          inArray(appointments.status, upcomingAppointmentStatuses),
        ),
      )
      .orderBy(asc(appointments.date), asc(appointments.startTime))

    return rows.map(toCompactAppointmentSummary)
  }

  async findHistoryByPatientId(
    patientId: string,
  ): Promise<CompactAppointmentSummary[]> {
    const rows = await db
      .select({
        id: appointments.id,
        doctorName: users.name,
        specialtyName: specialties.name,
        clinicName: clinics.name,
        date: appointments.date,
        startTime: appointments.startTime,
        status: appointments.status,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(users, eq(doctors.userId, users.id))
      .innerJoin(specialties, eq(appointments.specialtyId, specialties.id))
      .innerJoin(clinics, eq(appointments.clinicId, clinics.id))
      .where(
        and(
          eq(appointments.patientId, patientId),
          inArray(appointments.status, historyAppointmentStatuses),
        ),
      )
      .orderBy(desc(appointments.date), desc(appointments.startTime))

    return rows.map(toCompactAppointmentSummary)
  }
}
