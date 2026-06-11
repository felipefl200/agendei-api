import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../shared/errors/app-error.js'

import { appointmentsService } from './appointments.container.js'
import {
  appointmentParamsSchema,
  createAppointmentSchema,
} from './appointments.schemas.js'

export async function createAppointmentController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.user) {
    throw new AppError('Unauthenticated', 401)
  }

  const input = createAppointmentSchema.parse(request.body)

  return reply.code(201).send({
    appointment: await appointmentsService.create(request.user.id, input),
  })
}

export async function getAppointmentController(request: FastifyRequest) {
  if (!request.user) {
    throw new AppError('Unauthenticated', 401)
  }

  const { id } = appointmentParamsSchema.parse(request.params)

  return {
    appointment: await appointmentsService.getById(request.user.id, id),
  }
}

export async function listUpcomingAppointmentsController(
  request: FastifyRequest,
) {
  if (!request.user) {
    throw new AppError('Unauthenticated', 401)
  }

  return {
    appointments: await appointmentsService.listUpcoming(request.user.id),
  }
}

export async function listHistoryAppointmentsController(
  request: FastifyRequest,
) {
  if (!request.user) {
    throw new AppError('Unauthenticated', 401)
  }

  return {
    appointments: await appointmentsService.listHistory(request.user.id),
  }
}
