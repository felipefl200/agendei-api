import type { FastifyReply, FastifyRequest } from 'fastify'

import { specialtiesService } from './specialties.container.js'
import {
  createSpecialtySchema,
  specialtyParamsSchema,
  updateSpecialtySchema,
} from './specialties.schemas.js'

export async function listSpecialtiesController() {
  return {
    specialties: await specialtiesService.listActive(),
  }
}

export async function getSpecialtyController(request: FastifyRequest) {
  const { id } = specialtyParamsSchema.parse(request.params)

  return {
    specialty: await specialtiesService.getActiveById(id),
  }
}

export async function createSpecialtyController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const input = createSpecialtySchema.parse(request.body)

  return reply.code(201).send({
    specialty: await specialtiesService.create(input),
  })
}

export async function updateSpecialtyController(request: FastifyRequest) {
  const { id } = specialtyParamsSchema.parse(request.params)
  const input = updateSpecialtySchema.parse(request.body)

  return {
    specialty: await specialtiesService.update(id, input),
  }
}

export async function deleteSpecialtyController(request: FastifyRequest) {
  const { id } = specialtyParamsSchema.parse(request.params)

  return {
    specialty: await specialtiesService.deactivate(id),
  }
}
