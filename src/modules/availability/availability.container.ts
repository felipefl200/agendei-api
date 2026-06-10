import { randomUUID } from 'node:crypto'

import { DrizzleAvailabilityRepository } from './availability.repositories.js'
import { createAvailabilityService } from './availability.service.js'

export const availabilityService = createAvailabilityService({
  availabilityRepository: new DrizzleAvailabilityRepository(),
  idGenerator: { randomUUID },
})
