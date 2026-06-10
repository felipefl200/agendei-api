export type AvailabilityRule = {
  id: string
  doctorId: string
  clinicId: string
  weekday: number
  startTime: string
  endTime: string
  slotDurationInMinutes: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export type AvailableSlot = {
  time: string
  available: true
}

export type AvailableSlots = {
  doctorId: string
  clinicId: string
  date: string
  slots: AvailableSlot[]
}

export type CreateAvailabilityRuleInput = {
  id: string
  doctorId: string
  clinicId: string
  weekday: number
  startTime: string
  endTime: string
  slotDurationInMinutes: number
}

export type UpdateAvailabilityRuleInput = {
  clinicId?: string | undefined
  weekday?: number | undefined
  startTime?: string | undefined
  endTime?: string | undefined
  slotDurationInMinutes?: number | undefined
}

export type AvailabilityRepository = {
  findActiveDoctorById(id: string): Promise<{ id: string } | null>
  findActiveClinicById(id: string): Promise<{ id: string } | null>
  findActiveDoctorClinic(
    doctorId: string,
    clinicId: string,
  ): Promise<{ id: string } | null>
  findActiveRulesForDoctorClinicAndWeekday(input: {
    doctorId: string
    clinicId: string
    weekday: number
  }): Promise<AvailabilityRule[]>
  findOccupiedStartTimes(input: {
    doctorId: string
    clinicId: string
    date: Date
  }): Promise<string[]>
  listByDoctorId(doctorId: string): Promise<AvailabilityRule[]>
  findById(id: string): Promise<AvailabilityRule | null>
  create(input: CreateAvailabilityRuleInput): Promise<AvailabilityRule>
  update(
    id: string,
    input: UpdateAvailabilityRuleInput,
  ): Promise<AvailabilityRule>
  deactivate(id: string): Promise<AvailabilityRule>
}

export type IdGenerator = {
  randomUUID(): string
}
