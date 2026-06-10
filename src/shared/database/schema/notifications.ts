import { relations } from 'drizzle-orm'
import {
  boolean,
  char,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core'

import { users } from './users.js'

export const notifications = mysqlTable('notifications', {
  id: char('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: char('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  title: varchar('title', { length: 255 }).notNull(),
  message: varchar('message', { length: 1000 }).notNull(),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))
