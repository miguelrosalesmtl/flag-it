import { api } from '@/api/client'
import type { SetupInput, SetupResult, SetupStatus } from '@/types/setup'

export const setupApi = {
  status: () => api.get<SetupStatus>('/setup'),
  complete: (input: SetupInput) => api.post<SetupResult>('/setup', input),
}
