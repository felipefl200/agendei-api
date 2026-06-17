export type UserRole = 'patient' | 'doctor' | 'admin' | 'super_admin'

export type AuthenticatedUser = {
  id: string
  role: UserRole
}

export type JwtPayload = {
  sub: string
  role: UserRole
  exp?: number
}
