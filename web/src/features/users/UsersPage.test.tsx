import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { UsersPage } from '@/features/users/UsersPage'
import { renderWithProviders } from '@/test/render'
import { server } from '@/mocks/server'

describe('UsersPage', () => {
  // The container test exercises the whole slice: hook -> api -> MSW -> render.
  it('loads and renders users from the API', async () => {
    renderWithProviders(<UsersPage />)

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
  })

  it('deletes a user and refetches the list', async () => {
    renderWithProviders(<UsersPage />)

    const deleteAda = await screen.findByRole('button', { name: 'Delete Ada Lovelace' })
    await userEvent.click(deleteAda)

    await waitFor(() => expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument())
    expect(screen.getByText('Alan Turing')).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    server.use(http.get('/api/users', () => new HttpResponse(null, { status: 500 })))

    renderWithProviders(<UsersPage />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
