export type PatientUser = {
  id: string
  name: string
  email: string
  active: boolean
}

export type Patient = {
  id: string
  userId: string
  phone: string | null
  birthDate: Date | null
  document: string | null
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export type PatientProfile = {
  id: string
  name: string
  email: string
  phone: string | null
  birthDate: Date | null
  document: string | null
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export type PatientsUsersRepository = {
  findById(id: string): Promise<PatientUser | null>
  updateName(id: string, name: string): Promise<PatientUser>
}

export type PatientsRepository = {
  findByUserId(userId: string): Promise<Patient | null>
  updatePhone(id: string, phone: string | null): Promise<Patient>
}

export type PatientsTransactionContext = {
  users: PatientsUsersRepository
  patients: PatientsRepository
}

export type PatientsTransactionManager = {
  run<T>(callback: (context: PatientsTransactionContext) => Promise<T>): Promise<T>
}
