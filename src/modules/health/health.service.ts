export type HealthCheckResponse = {
  status: 'ok'
  timestamp: string
}

export function getHealthCheck(): HealthCheckResponse {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  }
}
