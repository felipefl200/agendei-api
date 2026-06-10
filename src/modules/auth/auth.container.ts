import { randomUUID } from 'node:crypto'

import { db } from '../../shared/database/index.js'

import {
  DrizzleAuthTransactionManager,
  DrizzleAuthUsersRepository,
} from './auth.repositories.js'
import { createAuthService } from './auth.service.js'
import { Argon2PasswordHasher } from './password.js'
import { jwtTokenProvider } from './token-provider.js'

export const authService = createAuthService({
  usersRepository: new DrizzleAuthUsersRepository(db),
  transactionManager: new DrizzleAuthTransactionManager(),
  passwordHasher: new Argon2PasswordHasher(),
  tokenProvider: jwtTokenProvider,
  idGenerator: { randomUUID },
  clock: {
    now: () => new Date(),
  },
})
