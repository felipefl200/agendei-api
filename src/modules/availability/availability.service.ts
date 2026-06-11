import { AppError } from '../../shared/errors/app-error.js'

import type {
  AvailabilityRepository,
  AvailabilityRule,
  AvailableSlots,
  CreateAvailabilityRuleInput,
  IdGenerator,
  UpdateAvailabilityRuleInput,
} from './availability.ports.js'
import type {
  AvailableSlotsQuery,
  CreateAvailabilityBody,
  UpdateAvailabilityBody,
} from './availability.schemas.js'
import {
  dateStringToUtcDate,
  generateRuleSlots,
  getWeekdayFromDateString,
  normalizeTimeForApi,
  normalizeTimeToMinutes,
} from './availability.time.js'

type AvailabilityServiceDeps = {
  availabilityRepository: AvailabilityRepository
  idGenerator: IdGenerator
}

function ensureValidRuleRange(input: {
  startTime: string
  endTime: string
  slotDurationInMinutes: number
}) {
  const start = normalizeTimeToMinutes(input.startTime)
  const end = normalizeTimeToMinutes(input.endTime)

  if (start >= end || input.slotDurationInMinutes > end - start) {
    throw new AppError('Invalid availability time range', 400)
  }
}

async function ensureActiveDoctorClinic(
  repository: AvailabilityRepository,
  doctorId: string,
  clinicId: string,
) {
  const doctor = await repository.findActiveDoctorById(doctorId)

  if (!doctor) {
    throw new AppError('Doctor not found', 404)
  }

  const clinic = await repository.findActiveClinicById(clinicId)

  if (!clinic) {
    throw new AppError('Clinic not found', 404)
  }

  const doctorClinic = await repository.findActiveDoctorClinic(
    doctorId,
    clinicId,
  )

  if (!doctorClinic) {
    throw new AppError('Doctor clinic relation not found', 404)
  }
}

function mergeRuleUpdate(
  rule: AvailabilityRule,
  input: UpdateAvailabilityBody,
): UpdateAvailabilityRuleInput & {
  clinicId: string
  weekday: number
  startTime: string
  endTime: string
  slotDurationInMinutes: number
} {
  return {
    clinicId: input.clinicId ?? rule.clinicId,
    weekday: input.weekday ?? rule.weekday,
    startTime: input.startTime ?? rule.startTime,
    endTime: input.endTime ?? rule.endTime,
    slotDurationInMinutes:
      input.slotDurationInMinutes ?? rule.slotDurationInMinutes,
  }
}

export function createAvailabilityService(deps: AvailabilityServiceDeps) {
  async function getAvailableSlots(
    doctorId: string,
    query: AvailableSlotsQuery,
  ): Promise<AvailableSlots> {
    await ensureActiveDoctorClinic(
      deps.availabilityRepository,
      doctorId,
      query.clinicId,
    )

    const weekday = getWeekdayFromDateString(query.date)
    const rules =
      await deps.availabilityRepository.findActiveRulesForDoctorClinicAndWeekday(
        {
          doctorId,
          clinicId: query.clinicId,
          weekday,
        },
      )

    if (rules.length === 0) {
      return {
        doctorId,
        clinicId: query.clinicId,
        date: query.date,
        slots: [],
      }
    }

    const occupiedStartTimes = new Set(
      (
        await deps.availabilityRepository.findOccupiedStartTimes({
          doctorId,
          clinicId: query.clinicId,
          date: dateStringToUtcDate(query.date),
        })
      ).map(normalizeTimeForApi),
    )

    const slotTimes = new Set<string>()

    for (const rule of rules) {
      for (const slot of generateRuleSlots(rule)) {
        if (!occupiedStartTimes.has(slot)) {
          slotTimes.add(slot)
        }
      }
    }

    return {
      doctorId,
      clinicId: query.clinicId,
      date: query.date,
      slots: Array.from(slotTimes)
        .sort()
        .map((time) => ({
          time,
          available: true as const,
        })),
    }
  }

  async function listByDoctor(doctorId: string): Promise<AvailabilityRule[]> {
    const doctor =
      await deps.availabilityRepository.findActiveDoctorById(doctorId)

    if (!doctor) {
      throw new AppError('Doctor not found', 404)
    }

    return await deps.availabilityRepository.listByDoctorId(doctorId)
  }

  async function create(
    doctorId: string,
    input: CreateAvailabilityBody,
  ): Promise<AvailabilityRule> {
    await ensureActiveDoctorClinic(
      deps.availabilityRepository,
      doctorId,
      input.clinicId,
    )
    ensureValidRuleRange(input)

    const createInput: CreateAvailabilityRuleInput = {
      id: deps.idGenerator.randomUUID(),
      doctorId,
      clinicId: input.clinicId,
      weekday: input.weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      slotDurationInMinutes: input.slotDurationInMinutes,
    }

    return await deps.availabilityRepository.create(createInput)
  }

  async function update(
    id: string,
    input: UpdateAvailabilityBody,
  ): Promise<AvailabilityRule> {
    const rule = await deps.availabilityRepository.findById(id)

    if (!rule) {
      throw new AppError('Availability not found', 404)
    }

    const mergedInput = mergeRuleUpdate(rule, input)

    await ensureActiveDoctorClinic(
      deps.availabilityRepository,
      rule.doctorId,
      mergedInput.clinicId,
    )
    ensureValidRuleRange(mergedInput)

    return await deps.availabilityRepository.update(id, input)
  }

  async function deactivate(id: string): Promise<AvailabilityRule> {
    const rule = await deps.availabilityRepository.findById(id)

    if (!rule) {
      throw new AppError('Availability not found', 404)
    }

    if (!rule.active) {
      return rule
    }

    return await deps.availabilityRepository.deactivate(id)
  }

  return {
    create,
    deactivate,
    getAvailableSlots,
    listByDoctor,
    update,
  }
}

export type AvailabilityService = ReturnType<typeof createAvailabilityService>
