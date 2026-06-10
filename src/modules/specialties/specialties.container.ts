import { DrizzleSpecialtiesRepository } from './specialties.repositories.js'
import { createSpecialtiesService } from './specialties.service.js'

export const specialtiesService = createSpecialtiesService({
  specialtiesRepository: new DrizzleSpecialtiesRepository(),
})
