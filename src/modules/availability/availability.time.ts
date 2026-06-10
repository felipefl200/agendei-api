export function normalizeTimeToMinutes(time: string) {
  const [hours = '0', minutes = '0'] = time.split(':')

  return Number(hours) * 60 + Number(minutes)
}

export function formatMinutesAsTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function normalizeTimeForDatabase(time: string) {
  return time.length === 5 ? `${time}:00` : time
}

export function normalizeTimeForApi(time: string) {
  return time.slice(0, 5)
}

export function dateStringToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`)
}

export function getWeekdayFromDateString(date: string) {
  return dateStringToUtcDate(date).getUTCDay()
}

export function generateRuleSlots(input: {
  startTime: string
  endTime: string
  slotDurationInMinutes: number
}) {
  const start = normalizeTimeToMinutes(input.startTime)
  const end = normalizeTimeToMinutes(input.endTime)
  const slots: string[] = []

  for (
    let current = start;
    current + input.slotDurationInMinutes <= end;
    current += input.slotDurationInMinutes
  ) {
    slots.push(formatMinutesAsTime(current))
  }

  return slots
}
