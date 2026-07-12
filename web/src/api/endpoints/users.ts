import { api } from '@/api/client'
import type { CreateUserInput, User } from '@/types/user'

export const usersApi = {
  list: () => api.get<User[]>('/users'),
  byId: (id: string) => api.get<User>(`/users/${id}`),
  create: (input: CreateUserInput) => api.post<User>('/users', input),
  remove: (id: string) => api.delete<void>(`/users/${id}`),
}
