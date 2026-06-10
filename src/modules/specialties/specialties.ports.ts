export type Specialty = {
  id: string
  name: string
  description: string | null
  icon: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export type CreateSpecialtyInput = {
  name: string
  description?: string | null | undefined
  icon?: string | null | undefined
}

export type UpdateSpecialtyInput = {
  name?: string | undefined
  description?: string | null | undefined
  icon?: string | null | undefined
}

export type SpecialtiesRepository = {
  findActive(): Promise<Specialty[]>
  findActiveById(id: string): Promise<Specialty | null>
  findById(id: string): Promise<Specialty | null>
  findByName(name: string): Promise<Specialty | null>
  create(input: CreateSpecialtyInput): Promise<Specialty>
  update(id: string, input: UpdateSpecialtyInput): Promise<Specialty>
  deactivate(id: string): Promise<Specialty>
}
