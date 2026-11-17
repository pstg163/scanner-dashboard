import { getAlert, getClip, listAlerts } from './dashboard'
import { isMockMode } from '../lib/mockMode'
import type { DashboardApi } from '../types'

export type { DashboardApi }

const realApi: DashboardApi = {
  list: listAlerts,
  get: getAlert,
  clip: getClip,
}

export async function getApi(): Promise<DashboardApi> {
  if (import.meta.env.DEV && isMockMode()) {
    const mod = await import('./mock')
    return mod.mockApi
  }
  return realApi
}
