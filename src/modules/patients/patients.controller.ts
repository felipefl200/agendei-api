import type { FastifyRequest } from 'fastify'

import { AppError } from '../../shared/errors/app-error.js'

import { patientsService } from './patients.container.js'
import { updatePatientProfileSchema } from './patients.schemas.js'

export async function getPatientMeController(request: FastifyRequest) {
  if (!request.user) {
    throw new AppError('Unauthenticated', 401)
  }

  return {
    patient: await patientsService.getMe(request.user.id),
  }
}

export async function updatePatientMeController(request: FastifyRequest) {
  if (!request.user) {
    throw new AppError('Unauthenticated', 401)
  }

  const input = updatePatientProfileSchema.parse(request.body)

  return {
    patient: await patientsService.updateMe(request.user.id, input),
  }
}
