import { getHealthCheck } from './health.service.js'

export function healthCheckController() {
  return getHealthCheck()
}
