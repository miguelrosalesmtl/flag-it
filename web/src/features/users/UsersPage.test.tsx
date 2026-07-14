import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'

import { UsersPage } from '@/features/users/UsersPage'
import { renderWithProviders } from '@/test/render'

test('lists users and creates a new one through the dialog', async () => {
  const user = userEvent.setup()
  renderWithProviders(<UsersPage />)

  // Seeded users load through MSW.
  expect(await screen.findByText('admin@flag-it.dev')).toBeInTheDocument()
  expect(screen.getByText('alan@example.com')).toBeInTheDocument()

  // Create a user via the dialog.
  await user.click(screen.getByRole('button', { name: 'New user' }))
  await user.type(screen.getByLabelText('Email'), 'grace@example.com')
  await user.type(screen.getByLabelText('Password'), 'supersecret123')
  await user.click(screen.getByRole('button', { name: 'Create user' }))

  await waitFor(() => expect(screen.getByText('grace@example.com')).toBeInTheDocument())
})
