export type DoctorSpecialtySummary = {
  id: string
  name: string
}

export type DoctorClinicSummary = {
  id: string
  name: string
  address: string | null
}

export type DoctorProfile = {
  id: string
  name: string
  email: string
  crm: string
  bio: string | null
  avatarUrl: string | null
  active: boolean
  specialty: DoctorSpecialtySummary | null
  clinic: DoctorClinicSummary | null
  availableToday: boolean
  createdAt: Date
  updatedAt: Date
}

export type DoctorRecord = DoctorProfile & {
  userId: string
}

export type ListDoctorsInput = {
  search?: string | undefined
  specialtyId?: string | undefined
  page: number
  perPage: number
}

export type PaginatedDoctors = {
  doctors: DoctorProfile[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

export type CreateDoctorInput = {
  id: string
  userId: string
  name: string
  email: string
  passwordHash: string
  crm: string
  bio?: string | null | undefined
  avatarUrl?: string | null | undefined
  specialtyId: string
  clinicId: string
}

export type UpdateDoctorInput = {
  name?: string | undefined
  email?: string | undefined
  crm?: string | undefined
  bio?: string | null | undefined
  avatarUrl?: string | null | undefined
  specialtyId?: string | undefined
  clinicId?: string | undefined
}

export type ActiveSpecialty = {
  id: string
  name: string
}

export type ActiveClinic = {
  id: string
  name: string
  address: string | null
}

export type DoctorsRepository = {
  listActive(input: ListDoctorsInput): Promise<PaginatedDoctors>
  findActiveById(id: string): Promise<DoctorProfile | null>
  findById(id: string): Promise<DoctorRecord | null>
  findByCrm(crm: string): Promise<DoctorRecord | null>
  findUserByEmail(email: string): Promise<{ id: string } | null>
  findActiveSpecialtyById(id: string): Promise<ActiveSpecialty | null>
  findActiveClinicById(id: string): Promise<ActiveClinic | null>
  create(input: CreateDoctorInput): Promise<DoctorProfile>
  update(id: string, input: UpdateDoctorInput): Promise<DoctorProfile>
  deactivate(id: string): Promise<DoctorProfile>
}

export type IdGenerator = {
  randomUUID(): string
}
