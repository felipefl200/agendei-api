import type { users } from '../../shared/database/schema/index.js'

export type UserRole = typeof users.$inferSelect.role

export type AuthenticatedUser = {
  id: string
  role: UserRole
}

export type JwtPayload = {
  sub: string
  role: UserRole
}
