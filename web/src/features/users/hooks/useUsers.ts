import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { usersApi } from '@/api/endpoints/users'
import type { CreateUserInput, UpdateUserInput } from '@/types/user'

const usersKey = ['users'] as const

export function useUsers() {
  return useQuery({ queryKey: usersKey, queryFn: () => usersApi.list() })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      usersApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  })
}
