import { randomUUID } from 'node:crypto'

import { DrizzleDoctorsRepository } from './doctors.repositories.js'
import { createDoctorsService } from './doctors.service.js'

export const doctorsService = createDoctorsService({
  doctorsRepository: new DrizzleDoctorsRepository(),
  idGenerator: { randomUUID },
})
