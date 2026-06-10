import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

import { env } from '../../config/env.js'

import * as schema from './schema/index.js'

const poolConnection = mysql.createPool(env.DATABASE_URL)

export const db = drizzle(poolConnection, { schema, mode: 'default' })
