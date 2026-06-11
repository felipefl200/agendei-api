import { AppError } from '../../shared/errors/app-error.js'
import {
  dateStringToUtcDate,
  formatMinutesAsTime,
  generateRuleSlots,
  getWeekdayFromDateString,
  normalizeTimeToMinutes,
} from '../availability/availability.time.js'

import type {
  AppointmentsRepository,
  AppointmentSummary,
  CanceledAppointmentSummary,
  Clock,
  CompactAppointmentSummary,
  IdGenerator,
  PatientRecord,
} from './appointments.ports.js'
import type {
  CancelAppointmentBody,
  CreateAppointmentBody,
} from './appointments.schemas.js'

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

function getSaoPauloDateTimeString(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  const hour = parts.find((part) => part.type === 'hour')?.value
  const minute = parts.find((part) => part.type === 'minute')?.value

  if (!year || !month || !day || !hour || !minute) {
    throw new Error('Could not format current date time')
  }

  return `${year}-${month}-${day}T${hour}:${minute}`
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

  async function listUpcoming(
    authenticatedUserId: string,
  ): Promise<CompactAppointmentSummary[]> {
    const patient = await getAuthenticatedPatient(
      deps.appointmentsRepository,
      authenticatedUserId,
    )

    return await deps.appointmentsRepository.findUpcomingByPatientId(patient.id)
  }

  async function listHistory(
    authenticatedUserId: string,
  ): Promise<CompactAppointmentSummary[]> {
    const patient = await getAuthenticatedPatient(
      deps.appointmentsRepository,
      authenticatedUserId,
    )

    return await deps.appointmentsRepository.findHistoryByPatientId(patient.id)
  }

  async function cancel(
    authenticatedUserId: string,
    id: string,
    input: CancelAppointmentBody,
  ): Promise<CanceledAppointmentSummary> {
    const patient = await getAuthenticatedPatient(
      deps.appointmentsRepository,
      authenticatedUserId,
    )
    const appointment =
      await deps.appointmentsRepository.findCancelableByIdForPatient({
        id,
        patientId: patient.id,
      })

    if (!appointment) {
      throw new AppError('Appointment not found', 404)
    }

    if (appointment.status === 'completed' || appointment.status === 'no_show') {
      throw new AppError('Appointment cannot be canceled', 400)
    }

    if (appointment.status === 'canceled') {
      throw new AppError('Appointment is already canceled', 409)
    }

    if (
      `${appointment.date}T${appointment.startTime}` <=
      getSaoPauloDateTimeString(deps.clock.now())
    ) {
      throw new AppError('Only future appointments can be canceled', 400)
    }

    const canceledAppointment = await deps.appointmentsRepository.cancel({
      id,
      patientId: patient.id,
      reason: input.reason,
      canceledByUserId: authenticatedUserId,
    })

    if (!canceledAppointment) {
      throw new AppError('Appointment cannot be canceled', 400)
    }

    return canceledAppointment
  }

  return {
    cancel,
    create,
    getById,
    listHistory,
    listUpcoming,
  }
}

export type AppointmentsService = ReturnType<typeof createAppointmentsService>
