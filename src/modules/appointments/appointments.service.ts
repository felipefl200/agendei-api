import { AppError } from '../../shared/errors/app-error.js'

import {
  dateStringToUtcDate,
  formatMinutesAsTime,
  generateRuleSlots,
  getWeekdayFromDateString,
  normalizeTimeToMinutes,
} from '../availability/availability.time.js'

import type {
  AppointmentSummary,
  AppointmentsRepository,
  Clock,
  IdGenerator,
  PatientRecord,
} from './appointments.ports.js'
import type { CreateAppointmentBody } from './appointments.schemas.js'

type AppointmentsServiceDeps = {
  appointmentsRepository: AppointmentsRepository
  idGenerator: IdGenerator
  clock: Clock
}

async function getAuthenticatedPatient(
  repository: AppointmentsRepository,
  userId: string,
): Promise<PatientRecord> {
  const patient = await repository.findActivePatientByUserId(userId)

  if (!patient) {
    throw new AppError('Patient profile not found', 404)
  }

  return patient
}

async function ensureActiveAppointmentRelations(
  repository: AppointmentsRepository,
  input: {
    doctorId: string
    clinicId: string
    specialtyId: string
  },
) {
  const doctor = await repository.findActiveDoctorById(input.doctorId)

  if (!doctor) {
    throw new AppError('Doctor not found', 404)
  }

  const clinic = await repository.findActiveClinicById(input.clinicId)

  if (!clinic) {
    throw new AppError('Clinic not found', 404)
  }

  const specialty = await repository.findActiveSpecialtyById(input.specialtyId)

  if (!specialty) {
    throw new AppError('Specialty not found', 404)
  }

  const doctorClinic = await repository.findActiveDoctorClinic(
    input.doctorId,
    input.clinicId,
  )

  if (!doctorClinic) {
    throw new AppError('Doctor clinic relation not found', 404)
  }

  const doctorSpecialty = await repository.findActiveDoctorSpecialty(
    input.doctorId,
    input.specialtyId,
  )

  if (!doctorSpecialty) {
    throw new AppError('Doctor specialty relation not found', 404)
  }
}

async function getAppointmentEndTime(
  repository: AppointmentsRepository,
  input: {
    doctorId: string
    clinicId: string
    date: string
    startTime: string
  },
) {
  const rules = await repository.findActiveAvailabilityRules({
    doctorId: input.doctorId,
    clinicId: input.clinicId,
    weekday: getWeekdayFromDateString(input.date),
  })

  for (const rule of rules) {
    if (generateRuleSlots(rule).includes(input.startTime)) {
      return formatMinutesAsTime(
        normalizeTimeToMinutes(input.startTime) + rule.slotDurationInMinutes,
      )
    }
  }

  throw new AppError('Appointment time is outside doctor availability', 400)
}

export function createAppointmentsService(deps: AppointmentsServiceDeps) {
  async function create(
    authenticatedUserId: string,
    input: CreateAppointmentBody,
  ): Promise<AppointmentSummary> {
    const patient = await getAuthenticatedPatient(
      deps.appointmentsRepository,
      authenticatedUserId,
    )

    if (input.date < deps.clock.todayDateString()) {
      throw new AppError('Appointment date cannot be in the past', 400)
    }

    await ensureActiveAppointmentRelations(deps.appointmentsRepository, input)

    const date = dateStringToUtcDate(input.date)
    const endTime = await getAppointmentEndTime(deps.appointmentsRepository, {
      doctorId: input.doctorId,
      clinicId: input.clinicId,
      date: input.date,
      startTime: input.startTime,
    })

    const conflictInput = {
      patientId: patient.id,
      doctorId: input.doctorId,
      date,
      startTime: input.startTime,
    }

    if (await deps.appointmentsRepository.hasDoctorConflict(conflictInput)) {
      throw new AppError('Appointment time is already occupied', 409)
    }

    if (await deps.appointmentsRepository.hasPatientConflict(conflictInput)) {
      throw new AppError('Patient already has an appointment at this time', 409)
    }

    const appointment = await deps.appointmentsRepository.create({
      id: deps.idGenerator.randomUUID(),
      patientId: patient.id,
      doctorId: input.doctorId,
      clinicId: input.clinicId,
      specialtyId: input.specialtyId,
      date,
      startTime: input.startTime,
      endTime,
      createdByUserId: authenticatedUserId,
    })

    if (!appointment) {
      throw new AppError('Appointment time is already occupied', 409)
    }

    return appointment
  }

  async function getById(
    authenticatedUserId: string,
    id: string,
  ): Promise<AppointmentSummary> {
    const patient = await getAuthenticatedPatient(
      deps.appointmentsRepository,
      authenticatedUserId,
    )
    const appointment = await deps.appointmentsRepository.findByIdForPatient({
      id,
      patientId: patient.id,
    })

    if (!appointment) {
      throw new AppError('Appointment not found', 404)
    }

    return appointment
  }

  return {
    create,
    getById,
  }
}

export type AppointmentsService = ReturnType<typeof createAppointmentsService>
