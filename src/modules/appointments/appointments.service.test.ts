import { describe, expect, it, vi } from 'vitest'

import type {
  AppointmentConflictInput,
  AppointmentsRepository,
  AppointmentSummary,
  AvailabilityRule,
  CancelableAppointmentRecord,
  CanceledAppointmentSummary,
  CompactAppointmentSummary,
  CreateAppointmentInput,
  IdGenerator,
  PatientRecord,
} from './appointments.ports.js'
import { createAppointmentsService } from './appointments.service.js'

const doctorId = '123e4567-e89b-12d3-a456-426614174010'
const specialtyId = '123e4567-e89b-12d3-a456-426614174000'
const clinicId = '123e4567-e89b-12d3-a456-426614174001'
const appointmentId = '123e4567-e89b-12d3-a456-426614174030'

type AppointmentRecord = AppointmentSummary & {
  canceledByUserId: string | null
  cancelReason: string | null
  patientId: string
}

class InMemoryAppointmentsRepository implements AppointmentsRepository {
  public readonly cancelSpy = vi.fn()
  public readonly createSpy = vi.fn()

  constructor(
    private readonly patients: Map<string, PatientRecord>,
    private readonly doctors: Set<string>,
    private readonly clinics: Set<string>,
    private readonly specialties: Set<string>,
    private readonly doctorClinics: Set<string>,
    private readonly doctorSpecialties: Set<string>,
    private readonly availabilityRules: AvailabilityRule[],
    private readonly appointments: Map<string, AppointmentRecord>,
  ) {}

  findActivePatientByUserId(userId: string): Promise<PatientRecord | null> {
    return Promise.resolve(this.patients.get(userId) ?? null)
  }

  findActiveDoctorById(id: string): Promise<{ id: string } | null> {
    return Promise.resolve(this.doctors.has(id) ? { id } : null)
  }

  findActiveClinicById(id: string): Promise<{ id: string } | null> {
    return Promise.resolve(this.clinics.has(id) ? { id } : null)
  }

  findActiveSpecialtyById(id: string): Promise<{ id: string } | null> {
    return Promise.resolve(this.specialties.has(id) ? { id } : null)
  }

  findActiveDoctorClinic(
    doctorId: string,
    clinicId: string,
  ): Promise<{ id: string } | null> {
    const key = `${doctorId}:${clinicId}`

    return Promise.resolve(this.doctorClinics.has(key) ? { id: key } : null)
  }

  findActiveDoctorSpecialty(
    doctorId: string,
    specialtyId: string,
  ): Promise<{ id: string } | null> {
    const key = `${doctorId}:${specialtyId}`

    return Promise.resolve(this.doctorSpecialties.has(key) ? { id: key } : null)
  }

  findActiveAvailabilityRules(input: {
    doctorId: string
    clinicId: string
    weekday: number
  }): Promise<AvailabilityRule[]> {
    if (
      input.doctorId !== doctorId ||
      input.clinicId !== clinicId ||
      input.weekday !== 1
    ) {
      return Promise.resolve([])
    }

    return Promise.resolve(this.availabilityRules)
  }

  hasDoctorConflict(input: AppointmentConflictInput): Promise<boolean> {
    return Promise.resolve(
      Array.from(this.appointments.values()).some((appointment) => {
        return (
          appointment.doctor.id === input.doctorId &&
          appointment.date === input.date.toISOString().slice(0, 10) &&
          appointment.startTime === input.startTime &&
          ['scheduled', 'confirmed'].includes(appointment.status)
        )
      }),
    )
  }

  hasPatientConflict(input: AppointmentConflictInput): Promise<boolean> {
    return Promise.resolve(
      Array.from(this.appointments.values()).some((appointment) => {
        return (
          appointment.patientId === input.patientId &&
          appointment.date === input.date.toISOString().slice(0, 10) &&
          appointment.startTime === input.startTime &&
          ['scheduled', 'confirmed'].includes(appointment.status)
        )
      }),
    )
  }

  create(input: CreateAppointmentInput): Promise<AppointmentSummary | null> {
    this.createSpy(input)

    return Promise.resolve(
      this.hasSynchronousConflict(input)
        ? null
        : this.createAppointmentRecord(input),
    )
  }

  findByIdForPatient(input: {
    id: string
    patientId: string
  }): Promise<AppointmentSummary | null> {
    const appointment = this.appointments.get(input.id)

    if (!appointment || appointment.patientId !== input.patientId) {
      return Promise.resolve(null)
    }

    const {
      canceledByUserId: _canceledByUserId,
      cancelReason: _cancelReason,
      patientId: _patientId,
      ...summary
    } = appointment

    return Promise.resolve(summary)
  }

  findCancelableByIdForPatient(input: {
    id: string
    patientId: string
  }): Promise<CancelableAppointmentRecord | null> {
    const appointment = this.appointments.get(input.id)

    if (!appointment || appointment.patientId !== input.patientId) {
      return Promise.resolve(null)
    }

    return Promise.resolve({
      id: appointment.id,
      patientId: appointment.patientId,
      date: appointment.date,
      startTime: appointment.startTime,
      status: appointment.status,
    })
  }

  cancel(input: {
    id: string
    patientId: string
    reason: string
    canceledByUserId: string
  }): Promise<CanceledAppointmentSummary | null> {
    this.cancelSpy(input)

    const appointment = this.appointments.get(input.id)

    if (
      !appointment ||
      appointment.patientId !== input.patientId ||
      !['scheduled', 'confirmed'].includes(appointment.status)
    ) {
      return Promise.resolve(null)
    }

    appointment.canceledByUserId = input.canceledByUserId
    appointment.cancelReason = input.reason
    appointment.status = 'canceled'

    return Promise.resolve({
      id: appointment.id,
      cancelReason: input.reason,
      status: 'canceled',
    })
  }

  findUpcomingByPatientId(
    patientId: string,
  ): Promise<CompactAppointmentSummary[]> {
    return Promise.resolve(
      this.findCompactByPatientAndStatuses(patientId, [
        'scheduled',
        'confirmed',
      ]).sort(compareAppointmentsAsc),
    )
  }

  findHistoryByPatientId(
    patientId: string,
  ): Promise<CompactAppointmentSummary[]> {
    return Promise.resolve(
      this.findCompactByPatientAndStatuses(patientId, [
        'completed',
        'canceled',
        'no_show',
      ]).sort(compareAppointmentsDesc),
    )
  }

  private hasSynchronousConflict(input: CreateAppointmentInput) {
    return Array.from(this.appointments.values()).some((appointment) => {
      return (
        ['scheduled', 'confirmed'].includes(appointment.status) &&
        appointment.date === input.date.toISOString().slice(0, 10) &&
        appointment.startTime === input.startTime &&
        (appointment.doctor.id === input.doctorId ||
          appointment.patientId === input.patientId)
      )
    })
  }

  private createAppointmentRecord(input: CreateAppointmentInput) {
    const appointment: AppointmentRecord = {
      id: input.id,
      patientId: input.patientId,
      doctor: {
        id: input.doctorId,
        name: 'Dra. Juliana Martins',
      },
      specialty: {
        id: input.specialtyId,
        name: 'Clínica Geral',
      },
      clinic: {
        id: input.clinicId,
        name: 'Clínica Saúde & Vida',
      },
      canceledByUserId: null,
      cancelReason: null,
      date: input.date.toISOString().slice(0, 10),
      startTime: input.startTime,
      endTime: input.endTime,
      status: 'scheduled',
    }

    this.appointments.set(appointment.id, appointment)

    return appointment
  }

  private findCompactByPatientAndStatuses(
    patientId: string,
    statuses: string[],
  ): CompactAppointmentSummary[] {
    return Array.from(this.appointments.values())
      .filter((appointment) => {
        return (
          appointment.patientId === patientId &&
          statuses.includes(appointment.status)
        )
      })
      .map(toCompactAppointmentSummary)
  }
}

function compareAppointmentsAsc(
  a: CompactAppointmentSummary,
  b: CompactAppointmentSummary,
) {
  return `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)
}

function compareAppointmentsDesc(
  a: CompactAppointmentSummary,
  b: CompactAppointmentSummary,
) {
  return compareAppointmentsAsc(b, a)
}

function toCompactAppointmentSummary(
  appointment: AppointmentRecord,
): CompactAppointmentSummary {
  return {
    id: appointment.id,
    doctorName: appointment.doctor.name,
    specialtyName: appointment.specialty.name,
    clinicName: appointment.clinic.name,
    date: appointment.date,
    startTime: appointment.startTime,
    status: appointment.status,
  }
}

function makeAppointment(
  overrides: Partial<AppointmentRecord> = {},
): AppointmentRecord {
  return {
    id: appointmentId,
    patientId: 'patient-id',
    doctor: {
      id: doctorId,
      name: 'Dra. Juliana Martins',
    },
    specialty: {
      id: specialtyId,
      name: 'Clínica Geral',
    },
    clinic: {
      id: clinicId,
      name: 'Clínica Saúde & Vida',
    },
    canceledByUserId: null,
    cancelReason: null,
    date: '2026-06-15',
    startTime: '10:30',
    endTime: '11:00',
    status: 'scheduled',
    ...overrides,
  }
}

function makeSut(
  options: {
    patient?: PatientRecord | null
    doctors?: string[]
    clinics?: string[]
    specialties?: string[]
    doctorClinics?: string[]
    doctorSpecialties?: string[]
    availabilityRules?: AvailabilityRule[]
    appointments?: AppointmentRecord[]
    now?: Date
    todayDateString?: string
  } = {},
) {
  const patients = new Map<string, PatientRecord>()

  if (options.patient !== null) {
    patients.set(
      'user-id',
      options.patient ?? {
        id: 'patient-id',
        userId: 'user-id',
      },
    )
  }

  const repository = new InMemoryAppointmentsRepository(
    patients,
    new Set(options.doctors ?? [doctorId]),
    new Set(options.clinics ?? [clinicId]),
    new Set(options.specialties ?? [specialtyId]),
    new Set(options.doctorClinics ?? [`${doctorId}:${clinicId}`]),
    new Set(options.doctorSpecialties ?? [`${doctorId}:${specialtyId}`]),
    options.availabilityRules ?? [
      {
        startTime: '10:00',
        endTime: '12:00',
        slotDurationInMinutes: 30,
      },
    ],
    new Map(
      options.appointments?.map(
        (appointment) => [appointment.id, appointment] as const,
      ) ?? [],
    ),
  )
  const idGenerator: IdGenerator = {
    randomUUID: vi.fn(() => 'new-appointment-id'),
  }

  return {
    repository,
    service: createAppointmentsService({
      appointmentsRepository: repository,
      idGenerator,
      clock: {
        now: () => options.now ?? new Date('2026-06-11T14:00:00.000Z'),
        todayDateString: () => options.todayDateString ?? '2026-06-11',
      },
    }),
  }
}

describe('appointments service', () => {
  it('creates a scheduled appointment for the authenticated patient', async () => {
    const { service, repository } = makeSut()

    const appointment = await service.create('user-id', {
      doctorId,
      specialtyId,
      clinicId,
      date: '2026-06-15',
      startTime: '10:30',
    })

    expect(repository.createSpy).toHaveBeenCalledWith({
      id: 'new-appointment-id',
      patientId: 'patient-id',
      doctorId,
      clinicId,
      specialtyId,
      date: new Date('2026-06-15T00:00:00.000Z'),
      startTime: '10:30',
      endTime: '11:00',
      createdByUserId: 'user-id',
    })
    expect(appointment).toMatchObject({
      id: 'new-appointment-id',
      doctor: { id: doctorId },
      specialty: { id: specialtyId },
      clinic: { id: clinicId },
      date: '2026-06-15',
      startTime: '10:30',
      endTime: '11:00',
      status: 'scheduled',
    })
  })

  it('rejects appointment creation without an authenticated patient profile', async () => {
    const { service } = makeSut({ patient: null })

    await expect(
      service.create('user-id', {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).rejects.toMatchObject({
      message: 'Patient profile not found',
      statusCode: 404,
    })
  })

  it('rejects appointments in the past', async () => {
    const { service } = makeSut({ todayDateString: '2026-06-16' })

    await expect(
      service.create('user-id', {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).rejects.toMatchObject({
      message: 'Appointment date cannot be in the past',
      statusCode: 400,
    })
  })

  it('rejects inactive or missing relations', async () => {
    await expect(
      makeSut({ doctors: [] }).service.create('user-id', {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).rejects.toMatchObject({
      message: 'Doctor not found',
      statusCode: 404,
    })

    await expect(
      makeSut({ clinics: [] }).service.create('user-id', {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).rejects.toMatchObject({
      message: 'Clinic not found',
      statusCode: 404,
    })

    await expect(
      makeSut({ specialties: [] }).service.create('user-id', {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).rejects.toMatchObject({
      message: 'Specialty not found',
      statusCode: 404,
    })
  })

  it('rejects missing doctor clinic or specialty relations', async () => {
    await expect(
      makeSut({ doctorClinics: [] }).service.create('user-id', {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).rejects.toMatchObject({
      message: 'Doctor clinic relation not found',
      statusCode: 404,
    })

    await expect(
      makeSut({ doctorSpecialties: [] }).service.create('user-id', {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).rejects.toMatchObject({
      message: 'Doctor specialty relation not found',
      statusCode: 404,
    })
  })

  it('rejects appointments outside doctor availability', async () => {
    const { service } = makeSut()

    await expect(
      service.create('user-id', {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '09:30',
      }),
    ).rejects.toMatchObject({
      message: 'Appointment time is outside doctor availability',
      statusCode: 400,
    })
  })

  it('rejects occupied doctor and patient times', async () => {
    const doctorConflict = makeSut({
      appointments: [
        makeAppointment({
          id: 'doctor-conflict-id',
          patientId: 'other-patient-id',
        }),
      ],
    })

    await expect(
      doctorConflict.service.create('user-id', {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).rejects.toMatchObject({
      message: 'Appointment time is already occupied',
      statusCode: 409,
    })

    const patientConflict = makeSut({
      appointments: [
        makeAppointment({
          id: 'patient-conflict-id',
          doctor: {
            id: 'other-doctor-id',
            name: 'Dr. Paulo Silva',
          },
        }),
      ],
    })

    await expect(
      patientConflict.service.create('user-id', {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).rejects.toMatchObject({
      message: 'Patient already has an appointment at this time',
      statusCode: 409,
    })
  })

  it('allows times from canceled appointments', async () => {
    const { service } = makeSut({
      appointments: [
        makeAppointment({
          status: 'canceled',
        }),
      ],
    })

    await expect(
      service.create('user-id', {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).resolves.toMatchObject({
      status: 'scheduled',
    })
  })

  it('cancels a future appointment from the authenticated patient', async () => {
    const appointment = makeAppointment({
      status: 'confirmed',
    })
    const { repository, service } = makeSut({
      appointments: [appointment],
    })

    await expect(
      service.cancel('user-id', appointmentId, {
        reason: 'Não poderei comparecer',
      }),
    ).resolves.toEqual({
      id: appointmentId,
      cancelReason: 'Não poderei comparecer',
      status: 'canceled',
    })

    expect(repository.cancelSpy).toHaveBeenCalledWith({
      id: appointmentId,
      patientId: 'patient-id',
      reason: 'Não poderei comparecer',
      canceledByUserId: 'user-id',
    })
    expect(appointment).toMatchObject({
      canceledByUserId: 'user-id',
      cancelReason: 'Não poderei comparecer',
      status: 'canceled',
    })
  })

  it('rejects canceling appointments from another patient', async () => {
    const { service } = makeSut({
      appointments: [
        makeAppointment({
          patientId: 'other-patient-id',
        }),
      ],
    })

    await expect(
      service.cancel('user-id', appointmentId, {
        reason: 'Não poderei comparecer',
      }),
    ).rejects.toMatchObject({
      message: 'Appointment not found',
      statusCode: 404,
    })
  })

  it('rejects canceling completed, no-show and already canceled appointments', async () => {
    await expect(
      makeSut({
        appointments: [
          makeAppointment({
            status: 'completed',
          }),
        ],
      }).service.cancel('user-id', appointmentId, {
        reason: 'Não poderei comparecer',
      }),
    ).rejects.toMatchObject({
      message: 'Appointment cannot be canceled',
      statusCode: 400,
    })

    await expect(
      makeSut({
        appointments: [
          makeAppointment({
            status: 'no_show',
          }),
        ],
      }).service.cancel('user-id', appointmentId, {
        reason: 'Não poderei comparecer',
      }),
    ).rejects.toMatchObject({
      message: 'Appointment cannot be canceled',
      statusCode: 400,
    })

    await expect(
      makeSut({
        appointments: [
          makeAppointment({
            status: 'canceled',
          }),
        ],
      }).service.cancel('user-id', appointmentId, {
        reason: 'Não poderei comparecer',
      }),
    ).rejects.toMatchObject({
      message: 'Appointment is already canceled',
      statusCode: 409,
    })
  })

  it('rejects canceling appointments that are not in the future by date and time', async () => {
    const { service } = makeSut({
      appointments: [
        makeAppointment({
          date: '2026-06-11',
          startTime: '10:30',
        }),
      ],
      now: new Date('2026-06-11T14:00:00.000Z'),
    })

    await expect(
      service.cancel('user-id', appointmentId, {
        reason: 'Não poderei comparecer',
      }),
    ).rejects.toMatchObject({
      message: 'Only future appointments can be canceled',
      statusCode: 400,
    })
  })

  it('keeps canceled appointments in history and frees their slot', async () => {
    const appointment = makeAppointment()
    const { service } = makeSut({
      appointments: [appointment],
    })

    await service.cancel('user-id', appointmentId, {
      reason: 'Não poderei comparecer',
    })

    await expect(service.listHistory('user-id')).resolves.toEqual([
      expect.objectContaining({
        id: appointmentId,
        status: 'canceled',
      }),
    ])
    await expect(
      service.create('user-id', {
        doctorId,
        specialtyId,
        clinicId,
        date: '2026-06-15',
        startTime: '10:30',
      }),
    ).resolves.toMatchObject({
      status: 'scheduled',
    })
  })

  it('returns only appointments from the authenticated patient', async () => {
    const { service } = makeSut({
      appointments: [
        makeAppointment(),
        makeAppointment({
          id: 'other-appointment-id',
          patientId: 'other-patient-id',
        }),
      ],
    })

    await expect(
      service.getById('user-id', appointmentId),
    ).resolves.toMatchObject({
      id: appointmentId,
    })
    await expect(
      service.getById('user-id', 'other-appointment-id'),
    ).rejects.toMatchObject({
      message: 'Appointment not found',
      statusCode: 404,
    })
  })

  it('lists upcoming appointments for the authenticated patient in chronological order', async () => {
    const { service } = makeSut({
      appointments: [
        makeAppointment({
          id: 'upcoming-later-id',
          date: '2026-06-16',
          startTime: '09:00',
          status: 'confirmed',
        }),
        makeAppointment({
          id: 'history-id',
          date: '2026-06-10',
          status: 'completed',
        }),
        makeAppointment({
          id: 'other-patient-id',
          patientId: 'other-patient-id',
        }),
        makeAppointment({
          id: 'upcoming-sooner-id',
          date: '2026-06-15',
          startTime: '08:30',
          status: 'scheduled',
        }),
      ],
    })

    await expect(service.listUpcoming('user-id')).resolves.toEqual([
      expect.objectContaining({
        id: 'upcoming-sooner-id',
        status: 'scheduled',
      }),
      expect.objectContaining({
        id: 'upcoming-later-id',
        status: 'confirmed',
      }),
    ])
  })

  it('lists appointment history for the authenticated patient from newest to oldest', async () => {
    const { service } = makeSut({
      appointments: [
        makeAppointment({
          id: 'old-completed-id',
          date: '2026-04-12',
          startTime: '10:00',
          status: 'completed',
        }),
        makeAppointment({
          id: 'upcoming-id',
          date: '2026-06-15',
          status: 'scheduled',
        }),
        makeAppointment({
          id: 'new-canceled-id',
          date: '2026-05-20',
          startTime: '14:00',
          status: 'canceled',
        }),
        makeAppointment({
          id: 'no-show-id',
          date: '2026-05-01',
          startTime: '08:00',
          status: 'no_show',
        }),
      ],
    })

    await expect(service.listHistory('user-id')).resolves.toEqual([
      expect.objectContaining({
        id: 'new-canceled-id',
        status: 'canceled',
      }),
      expect.objectContaining({
        id: 'no-show-id',
        status: 'no_show',
      }),
      expect.objectContaining({
        id: 'old-completed-id',
        status: 'completed',
      }),
    ])
  })
})
