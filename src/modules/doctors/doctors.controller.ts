import type { FastifyReply, FastifyRequest } from 'fastify'

import { doctorsService } from './doctors.container.js'
import {
  createDoctorSchema,
  doctorParamsSchema,
  listDoctorsQuerySchema,
  updateDoctorSchema,
} from './doctors.schemas.js'

export async function listDoctorsController(request: FastifyRequest) {
  const query = listDoctorsQuerySchema.parse(request.query)

  return await doctorsService.list(query)
}

export async function getDoctorController(request: FastifyRequest) {
  const { id } = doctorParamsSchema.parse(request.params)

  return {
    doctor: await doctorsService.getById(id),
  }
}

export async function createDoctorController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const input = createDoctorSchema.parse(request.body)

  return reply.code(201).send({
    doctor: await doctorsService.create(input),
  })
}

export async function updateDoctorController(request: FastifyRequest) {
  const { id } = doctorParamsSchema.parse(request.params)
  const input = updateDoctorSchema.parse(request.body)

  return {
    doctor: await doctorsService.update(id, input),
  }
}

export async function deleteDoctorController(request: FastifyRequest) {
  const { id } = doctorParamsSchema.parse(request.params)

  return {
    doctor: await doctorsService.deactivate(id),
  }
}
