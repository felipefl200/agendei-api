import { describe, expect, it, vi } from 'vitest'

import type {
  ActiveClinic,
  ActiveSpecialty,
  CreateDoctorInput,
  DoctorProfile,
  DoctorRecord,
  DoctorsRepository,
  IdGenerator,
  ListDoctorsInput,
  UpdateDoctorInput,
} from './doctors.ports.js'
import { createDoctorsService } from './doctors.service.js'

const fixedNow = new Date('2026-06-10T12:00:00.000Z')
const specialtyId = '123e4567-e89b-12d3-a456-426614174000'
const clinicId = '123e4567-e89b-12d3-a456-426614174001'

class InMemoryDoctorsRepository implements DoctorsRepository {
  public readonly createSpy = vi.fn()

  constructor(
    private readonly doctors: Map<string, DoctorRecord>,
    private readonly specialties: Map<string, ActiveSpecialty>,
    private readonly clinics: Map<string, ActiveClinic>,
  ) {}

  listActive(input: ListDoctorsInput) {
    const doctors = Array.from(this.doctors.values())
      .filter((doctor) => doctor.active)
      .filter((doctor) => {
        return input.search
          ? doctor.name.toLowerCase().includes(input.search.toLowerCase())
          : true
      })
      .filter((doctor) => {
        return input.specialtyId
          ? doctor.specialty?.id === input.specialtyId
          : true
      })
    const start = (input.page - 1) * input.perPage

    return Promise.resolve({
      doctors: doctors.slice(start, start + input.perPage),
      pagination: {
        page: input.page,
        perPage: input.perPage,
        total: doctors.length,
        totalPages: Math.ceil(doctors.length / input.perPage),
      },
    })
  }

  findActiveById(id: string): Promise<DoctorProfile | null> {
    const doctor = this.doctors.get(id)

    return Promise.resolve(doctor?.active ? doctor : null)
  }

  findById(id: string): Promise<DoctorRecord | null> {
    return Promise.resolve(this.doctors.get(id) ?? null)
  }

  findByCrm(crm: string): Promise<DoctorRecord | null> {
    return Promise.resolve(
      Array.from(this.doctors.values()).find((doctor) => doctor.crm === crm) ??
      null
    )
  }

  findUserByEmail(email: string): Promise<{ id: string } | null> {
    const doctor = Array.from(this.doctors.values()).find(
      (doctor) => doctor.email === email,
    )

    return Promise.resolve(doctor ? { id: doctor.userId } : null)
  }

  findActiveSpecialtyById(
    id: string,
  ): Promise<ActiveSpecialty | null> {
    return Promise.resolve(this.specialties.get(id) ?? null)
  }

  findActiveClinicById(id: string): Promise<ActiveClinic | null> {
    return Promise.resolve(this.clinics.get(id) ?? null)
  }

  create(input: CreateDoctorInput): Promise<DoctorProfile> {
    this.createSpy(input)

    const specialty = this.specialties.get(input.specialtyId)
    const clinic = this.clinics.get(input.clinicId)

    if (!specialty || !clinic) {
      return Promise.reject(new Error('Missing relation'))
    }

    const doctor: DoctorRecord = {
      id: input.id,
      userId: input.userId,
      name: input.name,
      email: input.email,
      crm: input.crm,
      bio: input.bio ?? null,
      avatarUrl: input.avatarUrl ?? null,
      active: true,
      specialty,
      clinic,
      availableToday: false,
      createdAt: fixedNow,
      updatedAt: fixedNow,
    }

    this.doctors.set(doctor.id, doctor)

    return Promise.resolve(doctor)
  }

  update(
    id: string,
    input: UpdateDoctorInput,
  ): Promise<DoctorProfile> {
    const doctor = this.doctors.get(id)

    if (!doctor) {
      return Promise.reject(new Error('Doctor not found'))
    }

    const updatedDoctor: DoctorRecord = {
      ...doctor,
      name: input.name ?? doctor.name,
      email: input.email ?? doctor.email,
      crm: input.crm ?? doctor.crm,
      bio: input.bio === undefined ? doctor.bio : input.bio,
      avatarUrl:
        input.avatarUrl === undefined ? doctor.avatarUrl : input.avatarUrl,
      specialty:
        input.specialtyId === undefined
          ? doctor.specialty
          : (this.specialties.get(input.specialtyId) ?? null),
      clinic:
        input.clinicId === undefined
          ? doctor.clinic
          : (this.clinics.get(input.clinicId) ?? null),
      updatedAt: fixedNow,
    }

    this.doctors.set(id, updatedDoctor)

    return Promise.resolve(updatedDoctor)
  }

  deactivate(id: string): Promise<DoctorProfile> {
    const doctor = this.doctors.get(id)

    if (!doctor) {
      return Promise.reject(new Error('Doctor not found'))
    }

    const updatedDoctor = {
      ...doctor,
      active: false,
      updatedAt: fixedNow,
    }

    this.doctors.set(id, updatedDoctor)

    return Promise.resolve(updatedDoctor)
  }
}

function makeDoctor(overrides: Partial<DoctorRecord> = {}): DoctorRecord {
  return {
    id: 'doctor-id',
    userId: 'doctor-user-id',
    name: 'Dra. Juliana Martins',
    email: 'juliana@clinica.com',
    crm: 'CRM/SP 123456',
    bio: 'Médica clínica geral.',
    avatarUrl: 'https://example.com/avatar.png',
    active: true,
    specialty: {
      id: specialtyId,
      name: 'Clínica Geral',
    },
    clinic: {
      id: clinicId,
      name: 'Clínica Saúde & Vida',
      address: 'Rua Exemplo, 123',
    },
    availableToday: true,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    ...overrides,
  }
}

function makeSut(options: {
  doctors?: DoctorRecord[]
  specialties?: ActiveSpecialty[]
  clinics?: ActiveClinic[]
} = {}) {
  const doctors = new Map<string, DoctorRecord>(
    options.doctors?.map((doctor) => [doctor.id, doctor] as const) ?? [
      ['doctor-id', makeDoctor()] as const,
    ],
  )
  const specialties = new Map<string, ActiveSpecialty>(
    options.specialties?.map((specialty) => [specialty.id, specialty] as const) ??
      [
        [
          specialtyId,
          {
            id: specialtyId,
            name: 'Clínica Geral',
          },
        ] as const,
      ],
  )
  const clinics = new Map<string, ActiveClinic>(
    options.clinics?.map((clinic) => [clinic.id, clinic] as const) ?? [
      [
        clinicId,
        {
          id: clinicId,
          name: 'Clínica Saúde & Vida',
          address: 'Rua Exemplo, 123',
        },
      ] as const,
    ],
  )
  const repository = new InMemoryDoctorsRepository(
    doctors,
    specialties,
    clinics,
  )
  const ids = ['new-doctor-id', 'new-user-id']
  const idGenerator: IdGenerator = {
    randomUUID: vi.fn(() => ids.shift() ?? 'fallback-id'),
  }

  return {
    doctors,
    repository,
    service: createDoctorsService({
      doctorsRepository: repository,
      idGenerator,
    }),
  }
}

describe('doctors service', () => {
  it('lists active doctors with filters and pagination', async () => {
    const { service } = makeSut({
      doctors: [
        makeDoctor({ id: 'doctor-1', name: 'Dra. Juliana Martins' }),
        makeDoctor({ id: 'doctor-2', name: 'Dr. Paulo Silva', active: false }),
        makeDoctor({ id: 'doctor-3', name: 'Dra. Ana Paula' }),
      ],
    })

    await expect(
      service.list({
        search: 'ana',
        specialtyId,
        page: 1,
        perPage: 1,
      }),
    ).resolves.toMatchObject({
      doctors: [{ id: 'doctor-1' }],
      pagination: {
        page: 1,
        perPage: 1,
        total: 2,
        totalPages: 2,
      },
    })
  })

  it('returns active doctor details', async () => {
    const { service } = makeSut()

    await expect(service.getById('doctor-id')).resolves.toMatchObject({
      id: 'doctor-id',
      name: 'Dra. Juliana Martins',
      specialty: {
        id: specialtyId,
      },
      clinic: {
        id: clinicId,
      },
    })
  })

  it('rejects missing or inactive doctor details', async () => {
    const { service } = makeSut({
      doctors: [makeDoctor({ active: false })],
    })

    await expect(service.getById('missing-id')).rejects.toMatchObject({
      message: 'Doctor not found',
      statusCode: 404,
    })
    await expect(service.getById('doctor-id')).rejects.toMatchObject({
      message: 'Doctor not found',
      statusCode: 404,
    })
  })

  it('creates doctors with user, specialty, and clinic relations', async () => {
    const { service, repository } = makeSut({
      doctors: [],
    })

    const doctor = await service.create({
      name: 'Dra. Juliana Martins',
      email: 'juliana@clinica.com',
      crm: 'CRM/SP 123456',
      bio: 'Médica clínica geral.',
      specialtyId,
      clinicId,
    })

    expect(repository.createSpy).toHaveBeenCalledWith({
      id: 'new-doctor-id',
      userId: 'new-user-id',
      name: 'Dra. Juliana Martins',
      email: 'juliana@clinica.com',
      passwordHash: 'dummy-hash',
      crm: 'CRM/SP 123456',
      bio: 'Médica clínica geral.',
      avatarUrl: undefined,
      specialtyId,
      clinicId,
    })
    expect(doctor).toMatchObject({
      id: 'new-doctor-id',
      name: 'Dra. Juliana Martins',
      specialty: { id: specialtyId },
      clinic: { id: clinicId },
    })
  })

  it('rejects duplicated crm and e-mail on create', async () => {
    const { service } = makeSut()

    await expect(
      service.create({
        name: 'Dra. Outra Médica',
        email: 'outra@clinica.com',
        crm: 'CRM/SP 123456',
        specialtyId,
        clinicId,
      }),
    ).rejects.toMatchObject({
      message: 'CRM already registered',
      statusCode: 409,
    })

    await expect(
      service.create({
        name: 'Dra. Outra Médica',
        email: 'juliana@clinica.com',
        crm: 'CRM/SP 654321',
        specialtyId,
        clinicId,
      }),
    ).rejects.toMatchObject({
      message: 'E-mail already registered',
      statusCode: 409,
    })
  })

  it('rejects missing active specialty or clinic on create', async () => {
    const missingSpecialtySut = makeSut({
      doctors: [],
      specialties: [],
    })

    await expect(
      missingSpecialtySut.service.create({
        name: 'Dra. Juliana Martins',
        email: 'juliana@clinica.com',
        crm: 'CRM/SP 123456',
        specialtyId,
        clinicId,
      }),
    ).rejects.toMatchObject({
      message: 'Specialty not found',
      statusCode: 404,
    })

    const missingClinicSut = makeSut({
      doctors: [],
      clinics: [],
    })

    await expect(
      missingClinicSut.service.create({
        name: 'Dra. Juliana Martins',
        email: 'juliana@clinica.com',
        crm: 'CRM/SP 123456',
        specialtyId,
        clinicId,
      }),
    ).rejects.toMatchObject({
      message: 'Clinic not found',
      statusCode: 404,
    })
  })

  it('updates doctor editable fields and relations', async () => {
    const newSpecialtyId = '123e4567-e89b-12d3-a456-426614174002'
    const newClinicId = '123e4567-e89b-12d3-a456-426614174003'
    const { service, doctors } = makeSut({
      specialties: [
        { id: specialtyId, name: 'Clínica Geral' },
        { id: newSpecialtyId, name: 'Cardiologia' },
      ],
      clinics: [
        {
          id: clinicId,
          name: 'Clínica Saúde & Vida',
          address: 'Rua Exemplo, 123',
        },
        {
          id: newClinicId,
          name: 'Clínica Central',
          address: 'Av. Central, 10',
        },
      ],
    })

    const doctor = await service.update('doctor-id', {
      name: 'Dra. Juliana Alves',
      bio: null,
      specialtyId: newSpecialtyId,
      clinicId: newClinicId,
    })

    expect(doctor).toMatchObject({
      name: 'Dra. Juliana Alves',
      bio: null,
      specialty: { id: newSpecialtyId },
      clinic: { id: newClinicId },
    })
    expect(doctors.get('doctor-id')).toMatchObject({
      name: 'Dra. Juliana Alves',
      bio: null,
    })
  })

  it('deactivates doctors instead of deleting them', async () => {
    const { service, doctors } = makeSut()

    const doctor = await service.deactivate('doctor-id')

    expect(doctor.active).toBe(false)
    expect(doctors.has('doctor-id')).toBe(true)
  })
})
