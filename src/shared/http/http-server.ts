import type { FastifyError, FastifyInstance } from 'fastify'
import fastify from 'fastify'

import { AppError } from '../errors/app-error.js'
import { logger } from '../logger/logger.js'

export function createHttpServer(): FastifyInstance {
  const server = fastify({
    logger: false,
  })

  server.setErrorHandler((error: FastifyError | AppError, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name,
        message: error.message,
      })
    }

    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      })
    }

    logger.error('Unhandled HTTP error', error)

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
    })
  })

  return server
}
