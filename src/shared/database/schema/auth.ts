import { char, mysqlTable, timestamp } from 'drizzle-orm/mysql-core'

export const authRevokedTokens = mysqlTable('auth_revoked_tokens', {
  tokenHash: char('token_hash', { length: 64 }).primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at').defaultNow().notNull(),
})
