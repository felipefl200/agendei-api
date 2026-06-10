import { describe, expect, it, vi } from 'vitest'

import type {
  AvailabilityRepository,
  AvailabilityRule,
  CreateAvailabilityRuleInput,
  IdGenerator,
  UpdateAvailabilityRuleInput,
} from './availability.ports.js'
import { createAvailabilityService } from './availability.service.js'

const fixedNow = new Date('2026-06-10T12:00:00.000Z')
const doctorId = '123e4567-e89b-12d3-a456-426614174010'
const clinicId = '123e4567-e89b-12d3-a456-426614174001'
const availabilityId = '123e4567-e89b-12d3-a456-426614174020'

type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'canceled'
type AppointmentSlot = {
  doctorId: string
  clinicId: string
  date: string
  startTime: string
  status: AppointmentStatus
}

class InMemoryAvailabilityRepository implements AvailabilityRepository {
  public readonly createSpy = vi.fn()

  constructor(
    private readonly doctors: Set<string>,
    private readonly clinics: Set<string>,
    private readonly doctorClinics: Set<string>,
    private readonly rules: Map<string, AvailabilityRule>,
    private readonly appointments: AppointmentSlot[],
  ) {}

  findActiveDoctorById(id: string): Promise<{ id: string } | null> {
    return Promise.resolve(this.doctors.has(id) ? { id } : null)
  }

  findActiveClinicById(id: string): Promise<{ id: string } | null> {
    return Promise.resolve(this.clinics.has(id) ? { id } : null)
  }

  findActiveDoctorClinic(
    doctorId: string,
    clinicId: string,
  ): Promise<{ id: string } | null> {
    const key = `${doctorId}:${clinicId}`

    return Promise.resolve(this.doctorClinics.has(key) ? { id: key } : null)
  }

  findActiveRulesForDoctorClinicAndWeekday(input: {
    doctorId: string
    clinicId: string
    weekday: number
  }): Promise<AvailabilityRule[]> {
    return Promise.resolve(
      Array.from(this.rules.values()).filter((rule) => {
        return (
          rule.active &&
          rule.doctorId === input.doctorId &&
          rule.clinicId === input.clinicId &&
          rule.weekday === input.weekday
        )
      }),
    )
  }

  findOccupiedStartTimes(input: {
    doctorId: string
    clinicId: string
    date: Date
  }): Promise<string[]> {
    const date = input.date.toISOString().slice(0, 10)

    return Promise.resolve(
      this.appointments
        .filter((appointment) => {
          return (
            appointment.doctorId === input.doctorId &&
            appointment.clinicId === input.clinicId &&
            appointment.date === date &&
            ['scheduled', 'confirmed'].includes(appointment.status)
          )
        })
        .map((appointment) => appointment.startTime),
    )
  }

  listByDoctorId(doctorId: string): Promise<AvailabilityRule[]> {
    return Promise.resolve(
      Array.from(this.rules.values()).filter(
        (rule) => rule.doctorId === doctorId,
      ),
    )
  }

  findById(id: string): Promise<AvailabilityRule | null> {
    return Promise.resolve(this.rules.get(id) ?? null)
  }

  create(input: CreateAvailabilityRuleInput): Promise<AvailabilityRule> {
    this.createSpy(input)

    const rule: AvailabilityRule = {
      ...input,
      active: true,
      createdAt: fixedNow,
      updatedAt: fixedNow,
    }

    this.rules.set(rule.id, rule)

    return Promise.resolve(rule)
  }

  update(id: string, input: UpdateAvailabilityRuleInput): Promise<AvailabilityRule> {
    const rule = this.rules.get(id)

    if (!rule) {
      throw new Error('Availability not found')
    }

    const updatedRule: AvailabilityRule = {
      ...rule,
      clinicId: input.clinicId ?? rule.clinicId,
      weekday: input.weekday ?? rule.weekday,
      startTime: input.startTime ?? rule.startTime,
      endTime: input.endTime ?? rule.endTime,
      slotDurationInMinutes:
        input.slotDurationInMinutes ?? rule.slotDurationInMinutes,
      updatedAt: fixedNow,
    }

    this.rules.set(id, updatedRule)

    return Promise.resolve(updatedRule)
  }

  deactivate(id: string): Promise<AvailabilityRule> {
    const rule = this.rules.get(id)

    if (!rule) {
      throw new Error('Availability not found')
    }

    const updatedRule = {
      ...rule,
      active: false,
      updatedAt: fixedNow,
    }

    this.rules.set(id, updatedRule)

    return Promise.resolve(updatedRule)
  }
}

function makeRule(overrides: Partial<AvailabilityRule> = {}): AvailabilityRule {
  return {
    id: availabilityId,
    doctorId,
    clinicId,
    weekday: 1,
    startTime: '08:00',
    endTime: '10:00',
    slotDurationInMinutes: 30,
    active: true,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    ...overrides,
  }
}

function makeSut(options: {
  doctors?: string[]
  clinics?: string[]
  doctorClinics?: string[]
  rules?: AvailabilityRule[]
  appointments?: AppointmentSlot[]
} = {}) {
  const doctors = new Set(options.doctors ?? [doctorId])
  const clinics = new Set(options.clinics ?? [clinicId])
  const doctorClinics = new Set(
    options.doctorClinics ?? [`${doctorId}:${clinicId}`],
  )
  const rules = new Map<string, AvailabilityRule>(
    options.rules?.map((rule) => [rule.id, rule] as const) ?? [
      [availabilityId, makeRule()] as const,
    ],
  )
  const repository = new InMemoryAvailabilityRepository(
    doctors,
    clinics,
    doctorClinics,
    rules,
    options.appointments ?? [],
  )
  const idGenerator: IdGenerator = {
    randomUUID: vi.fn(() => 'new-availability-id'),
  }

  return {
    repository,
    rules,
    service: createAvailabilityService({
      availabilityRepository: repository,
      idGenerator,
    }),
  }
}

describe('availability service', () => {
  it('returns available slots for doctor, clinic, and date', async () => {
    const { service } = makeSut()

    await expect(
      service.getAvailableSlots(doctorId, {
        clinicId,
        date: '2026-06-15',
      }),
    ).resolves.toEqual({
      doctorId,
      clinicId,
      date: '2026-06-15',
      slots: [
        { time: '08:00', available: true },
        { time: '08:30', available: true },
        { time: '09:00', available: true },
        { time: '09:30', available: true },
      ],
    })
  })

  it('removes scheduled and confirmed appointments while keeping canceled slots available', async () => {
    const { service } = makeSut({
      appointments: [
        {
          doctorId,
          clinicId,
          date: '2026-06-15',
          startTime: '09:00:00',
          status: 'scheduled',
        },
        {
          doctorId,
          clinicId,
          date: '2026-06-15',
          startTime: '09:30:00',
          status: 'canceled',
        },
      ],
    })

    await expect(
      service.getAvailableSlots(doctorId, {
        clinicId,
        date: '2026-06-15',
      }),
    ).resolves.toMatchObject({
      slots: [
        { time: '08:00', available: true },
        { time: '08:30', available: true },
        { time: '09:30', available: true },
      ],
    })
  })

  it('returns an empty slot list when date has no availability', async () => {
    const { service } = makeSut({
      rules: [makeRule({ weekday: 2 })],
    })

    await expect(
      service.getAvailableSlots(doctorId, {
        clinicId,
        date: '2026-06-15',
      }),
    ).resolves.toEqual({
      doctorId,
      clinicId,
      date: '2026-06-15',
      slots: [],
    })
  })

  it('rejects inactive doctor, inactive clinic, or missing doctor clinic relation', async () => {
    await expect(
      makeSut({ doctors: [] }).service.getAvailableSlots(doctorId, {
        clinicId,
        date: '2026-06-15',
      }),
    ).rejects.toMatchObject({
      message: 'Doctor not found',
      statusCode: 404,
    })

    await expect(
      makeSut({ clinics: [] }).service.getAvailableSlots(doctorId, {
        clinicId,
        date: '2026-06-15',
      }),
    ).rejects.toMatchObject({
      message: 'Clinic not found',
      statusCode: 404,
    })

    await expect(
      makeSut({ doctorClinics: [] }).service.getAvailableSlots(doctorId, {
        clinicId,
        date: '2026-06-15',
      }),
    ).rejects.toMatchObject({
      message: 'Doctor clinic relation not found',
      statusCode: 404,
    })
  })

  it('lists availability rules by active doctor', async () => {
    const { service } = makeSut()

    await expect(service.listByDoctor(doctorId)).resolves.toHaveLength(1)
  })

  it('creates availability rules for active doctor clinic relations', async () => {
    const { service, repository } = makeSut({ rules: [] })

    const rule = await service.create(doctorId, {
      clinicId,
      weekday: 1,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
    })

    expect(repository.createSpy).toHaveBeenCalledWith({
      id: 'new-availability-id',
      doctorId,
      clinicId,
      weekday: 1,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
    })
    expect(rule).toMatchObject({
      id: 'new-availability-id',
      active: true,
    })
  })

  it('updates availability rules using the merged time range', async () => {
    const { service, rules } = makeSut()

    const rule = await service.update(availabilityId, {
      endTime: '11:00',
      slotDurationInMinutes: 60,
    })

    expect(rule).toMatchObject({
      endTime: '11:00',
      slotDurationInMinutes: 60,
    })
    expect(rules.get(availabilityId)).toMatchObject({
      endTime: '11:00',
      slotDurationInMinutes: 60,
    })
  })

  it('rejects invalid merged time ranges on update', async () => {
    const { service } = makeSut()

    await expect(
      service.update(availabilityId, {
        endTime: '08:15',
        slotDurationInMinutes: 30,
      }),
    ).rejects.toMatchObject({
      message: 'Invalid availability time range',
      statusCode: 400,
    })
  })

  it('deactivates availability rules instead of deleting them', async () => {
    const { service, rules } = makeSut()

    const rule = await service.deactivate(availabilityId)

    expect(rule.active).toBe(false)
    expect(rules.has(availabilityId)).toBe(true)
  })
})
