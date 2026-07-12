import { api } from '@/api/client'
import type { AuthUser, LoginInput, Session } from '@/types/auth'

export const authApi = {
  login: (input: LoginInput) => api.post<Session>('/auth/login', input),
  me: () => api.get<AuthUser>('/me'),
}
