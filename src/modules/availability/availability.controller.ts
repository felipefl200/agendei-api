import type { FastifyReply, FastifyRequest } from 'fastify'

import { availabilityService } from './availability.container.js'
import {
  availabilityParamsSchema,
  availableSlotsQuerySchema,
  createAvailabilitySchema,
  doctorAvailabilityParamsSchema,
  updateAvailabilitySchema,
} from './availability.schemas.js'

export async function getAvailableSlotsController(request: FastifyRequest) {
  const { doctorId } = doctorAvailabilityParamsSchema.parse(request.params)
  const query = availableSlotsQuerySchema.parse(request.query)

  return await availabilityService.getAvailableSlots(doctorId, query)
}

export async function listDoctorAvailabilityController(
  request: FastifyRequest,
) {
  const { doctorId } = doctorAvailabilityParamsSchema.parse(request.params)

  return {
    availability: await availabilityService.listByDoctor(doctorId),
  }
}

export async function createDoctorAvailabilityController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { doctorId } = doctorAvailabilityParamsSchema.parse(request.params)
  const input = createAvailabilitySchema.parse(request.body)

  return reply.code(201).send({
    availability: await availabilityService.create(doctorId, input),
  })
}

export async function updateAvailabilityController(request: FastifyRequest) {
  const { id } = availabilityParamsSchema.parse(request.params)
  const input = updateAvailabilitySchema.parse(request.body)

  return {
    availability: await availabilityService.update(id, input),
  }
}

export async function deleteAvailabilityController(request: FastifyRequest) {
  const { id } = availabilityParamsSchema.parse(request.params)

  return {
    availability: await availabilityService.deactivate(id),
  }
}
