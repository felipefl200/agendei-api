import { db } from '../../shared/database/index.js'

import {
  DrizzlePatientsRepository,
  DrizzlePatientsTransactionManager,
  DrizzlePatientsUsersRepository,
} from './patients.repositories.js'
import { createPatientsService } from './patients.service.js'

export const patientsService = createPatientsService({
  usersRepository: new DrizzlePatientsUsersRepository(db),
  patientsRepository: new DrizzlePatientsRepository(db),
  transactionManager: new DrizzlePatientsTransactionManager(),
})
