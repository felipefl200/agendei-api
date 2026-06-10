import { relations } from 'drizzle-orm'
import {
  boolean,
  char,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core'

import { doctors } from './doctors.js'

export const specialties = mysqlTable('specialties', {
  id: char('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 500 }),
  icon: varchar('icon', { length: 100 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const doctorSpecialties = mysqlTable('doctor_specialties', {
  id: char('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  doctorId: char('doctor_id', { length: 36 })
    .notNull()
    .references(() => doctors.id, { onDelete: 'restrict' }),
  specialtyId: char('specialty_id', { length: 36 })
    .notNull()
    .references(() => specialties.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const specialtiesRelations = relations(specialties, ({ many }) => ({
  doctorSpecialties: many(doctorSpecialties),
}))

export const doctorSpecialtiesRelations = relations(
  doctorSpecialties,
  ({ one }) => ({
    doctor: one(doctors, {
      fields: [doctorSpecialties.doctorId],
      references: [doctors.id],
    }),
    specialty: one(specialties, {
      fields: [doctorSpecialties.specialtyId],
      references: [specialties.id],
    }),
  }),
)
