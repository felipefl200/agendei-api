import type { AppointmentStatus } from './appointments.types.js'

export type AppointmentSummary = {
  id: string
  doctor: {
    id: string
    name: string
  }
  specialty: {
    id: string
    name: string
  }
  clinic: {
    id: string
    name: string
  }
  date: string
  startTime: string
  endTime: string
  status: AppointmentStatus
}

export type PatientRecord = {
  id: string
  userId: string
}

export type AvailabilityRule = {
  startTime: string
  endTime: string
  slotDurationInMinutes: number
}

export type CreateAppointmentInput = {
  id: string
  patientId: string
  doctorId: string
  clinicId: string
  specialtyId: string
  date: Date
  startTime: string
  endTime: string
  createdByUserId: string
}

export type AppointmentConflictInput = {
  patientId: string
  doctorId: string
  date: Date
  startTime: string
}

export type AppointmentsRepository = {
  findActivePatientByUserId(userId: string): Promise<PatientRecord | null>
  findActiveDoctorById(id: string): Promise<{ id: string } | null>
  findActiveClinicById(id: string): Promise<{ id: string } | null>
  findActiveSpecialtyById(id: string): Promise<{ id: string } | null>
  findActiveDoctorClinic(
    doctorId: string,
    clinicId: string,
  ): Promise<{ id: string } | null>
  findActiveDoctorSpecialty(
    doctorId: string,
    specialtyId: string,
  ): Promise<{ id: string } | null>
  findActiveAvailabilityRules(input: {
    doctorId: string
    clinicId: string
    weekday: number
  }): Promise<AvailabilityRule[]>
  hasDoctorConflict(input: AppointmentConflictInput): Promise<boolean>
  hasPatientConflict(input: AppointmentConflictInput): Promise<boolean>
  create(input: CreateAppointmentInput): Promise<AppointmentSummary | null>
  findByIdForPatient(input: {
    id: string
    patientId: string
  }): Promise<AppointmentSummary | null>
}

export type Clock = {
  todayDateString(): string
}

export type IdGenerator = {
  randomUUID(): string
}
