import { relations } from 'drizzle-orm'
import {
  boolean,
  char,
  int,
  mysqlTable,
  time,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core'

import { clinics } from './clinics.js'
import { users } from './users.js'

export const doctors = mysqlTable('doctors', {
  id: char('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: char('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' })
    .unique(),
  crm: varchar('crm', { length: 50 }).notNull().unique(),
  bio: varchar('bio', { length: 1000 }),
  avatarUrl: varchar('avatar_url', { length: 255 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const doctorClinics = mysqlTable('doctor_clinics', {
  id: char('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  doctorId: char('doctor_id', { length: 36 })
    .notNull()
    .references(() => doctors.id, { onDelete: 'restrict' }),
  clinicId: char('clinic_id', { length: 36 })
    .notNull()
    .references(() => clinics.id, { onDelete: 'restrict' }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const doctorAvailabilities = mysqlTable('doctor_availabilities', {
  id: char('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  doctorId: char('doctor_id', { length: 36 })
    .notNull()
    .references(() => doctors.id, { onDelete: 'restrict' }),
  clinicId: char('clinic_id', { length: 36 })
    .notNull()
    .references(() => clinics.id, { onDelete: 'restrict' }),
  weekday: int('weekday').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  slotDurationMinutes: int('slot_duration_minutes').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, {
    fields: [doctors.userId],
    references: [users.id],
  }),
  doctorClinics: many(doctorClinics),
  availabilities: many(doctorAvailabilities),
}))

export const doctorClinicsRelations = relations(doctorClinics, ({ one }) => ({
  doctor: one(doctors, {
    fields: [doctorClinics.doctorId],
    references: [doctors.id],
  }),
  clinic: one(clinics, {
    fields: [doctorClinics.clinicId],
    references: [clinics.id],
  }),
}))

export const doctorAvailabilitiesRelations = relations(
  doctorAvailabilities,
  ({ one }) => ({
    doctor: one(doctors, {
      fields: [doctorAvailabilities.doctorId],
      references: [doctors.id],
    }),
    clinic: one(clinics, {
      fields: [doctorAvailabilities.clinicId],
      references: [clinics.id],
    }),
  }),
)
