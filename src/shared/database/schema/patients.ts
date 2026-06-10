import { relations } from 'drizzle-orm'
import {
  char,
  date,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core'

import { users } from './users.js'

export const patients = mysqlTable('patients', {
  id: char('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: char('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' })
    .unique(),
  phone: varchar('phone', { length: 20 }),
  birthDate: date('birth_date'),
  document: varchar('document', { length: 50 }).unique(),
  avatarUrl: varchar('avatar_url', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const patientsRelations = relations(patients, ({ one }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
}))
