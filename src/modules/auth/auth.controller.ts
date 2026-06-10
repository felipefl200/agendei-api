import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../shared/errors/app-error.js'

import { loginSchema, registerPatientSchema } from './auth.schemas.js'
import {
  getAuthenticatedUser,
  login,
  registerPatient,
} from './auth.service.js'

export async function registerPatientController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const input = registerPatientSchema.parse(request.body)
  const response = await registerPatient(input)

  return reply.code(201).send(response)
}

export async function loginController(request: FastifyRequest) {
  const input = loginSchema.parse(request.body)

  return login(input)
}

export async function meController(request: FastifyRequest) {
  if (!request.user) {
    throw new AppError('Unauthenticated', 401)
  }

  return {
    user: await getAuthenticatedUser(request.user.id),
  }
}
