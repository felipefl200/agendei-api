import { relations } from 'drizzle-orm'
import {
  char,
  date,
  mysqlEnum,
  mysqlTable,
  time,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core'

import { clinics } from './clinics.js'
import { doctors } from './doctors.js'
import { patients } from './patients.js'
import { specialties } from './specialties.js'
import { users } from './users.js'

export const appointmentStatusEnum = mysqlEnum('status', [
  'scheduled',
  'confirmed',
  'completed',
  'canceled',
  'no_show',
])

export const appointments = mysqlTable('appointments', {
  id: char('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  patientId: char('patient_id', { length: 36 })
    .notNull()
    .references(() => patients.id, { onDelete: 'restrict' }),
  doctorId: char('doctor_id', { length: 36 })
    .notNull()
    .references(() => doctors.id, { onDelete: 'restrict' }),
  clinicId: char('clinic_id', { length: 36 })
    .notNull()
    .references(() => clinics.id, { onDelete: 'restrict' }),
  specialtyId: char('specialty_id', { length: 36 })
    .notNull()
    .references(() => specialties.id, { onDelete: 'restrict' }),
  date: date('date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  status: appointmentStatusEnum.default('scheduled').notNull(),
  cancelReason: varchar('cancel_reason', { length: 500 }),
  createdByUserId: char('created_by_user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  canceledByUserId: char('canceled_by_user_id', { length: 36 }).references(
    () => users.id,
    { onDelete: 'restrict' },
  ),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [appointments.doctorId],
    references: [doctors.id],
  }),
  clinic: one(clinics, {
    fields: [appointments.clinicId],
    references: [clinics.id],
  }),
  specialty: one(specialties, {
    fields: [appointments.specialtyId],
    references: [specialties.id],
  }),
  createdByUser: one(users, {
    fields: [appointments.createdByUserId],
    references: [users.id],
  }),
  canceledByUser: one(users, {
    fields: [appointments.canceledByUserId],
    references: [users.id],
  }),
}))
