import { relations } from 'drizzle-orm'
import {
  boolean,
  char,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core'

import { users } from './users.js'

export const clinics = mysqlTable('clinics', {
  id: char('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  corporateName: varchar('corporate_name', { length: 255 }),
  document: varchar('document', { length: 50 }).unique(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: varchar('address', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 50 }),
  zipCode: varchar('zip_code', { length: 20 }),
  active: boolean('active').default(true).notNull(),
  createdByUserId: char('created_by_user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const clinicAdmins = mysqlTable('clinic_admins', {
  id: char('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  clinicId: char('clinic_id', { length: 36 })
    .notNull()
    .references(() => clinics.id, { onDelete: 'restrict' }),
  userId: char('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const clinicsRelations = relations(clinics, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [clinics.createdByUserId],
    references: [users.id],
  }),
  admins: many(clinicAdmins),
}))

export const clinicAdminsRelations = relations(clinicAdmins, ({ one }) => ({
  clinic: one(clinics, {
    fields: [clinicAdmins.clinicId],
    references: [clinics.id],
  }),
  user: one(users, {
    fields: [clinicAdmins.userId],
    references: [users.id],
  }),
}))
