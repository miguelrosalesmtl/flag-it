import { api } from '@/api/client'
import type { CreateUserInput, UpdateUserInput, User } from '@/types/user'

export const usersApi = {
  list: () => api.get<{ users: User[] | null }>('/users').then((r) => r.users ?? []),
  create: (input: CreateUserInput) => api.post<User>('/users', input),
  update: (id: string, input: UpdateUserInput) => api.patch<User>(`/users/${id}`, input),
  remove: (id: string) => api.delete<void>(`/users/${id}`),
}
