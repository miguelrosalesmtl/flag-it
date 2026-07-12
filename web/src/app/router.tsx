import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { UsersPage } from '@/features/users/UsersPage'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { index: true, Component: UsersPage },
      { path: 'users', Component: UsersPage },
    ],
  },
])
