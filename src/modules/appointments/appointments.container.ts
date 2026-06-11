import { randomUUID } from 'node:crypto'

import { DrizzleAppointmentsRepository } from './appointments.repositories.js'
import { createAppointmentsService } from './appointments.service.js'

function todayDateString() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Could not format current date')
  }

  return `${year}-${month}-${day}`
}

export const appointmentsService = createAppointmentsService({
  appointmentsRepository: new DrizzleAppointmentsRepository(),
  idGenerator: { randomUUID },
  clock: {
    now: () => new Date(),
    todayDateString,
  },
})
