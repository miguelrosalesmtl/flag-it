import { useNavigate } from 'react-router'

import { SetupWizard } from '@/features/setup/components/SetupWizard'
import { useCompleteSetup } from '@/features/setup/hooks/useSetup'

/**
 * Container for first-run setup. Runs the wizard, and on success the new
 * superuser is already signed in (the hook seeds the session), so we just send
 * them into the app.
 */
export function SetupPage() {
  const navigate = useNavigate()
  const setup = useCompleteSetup()

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <SetupWizard
        onSubmit={(input) =>
          setup.mutate(input, { onSuccess: () => void navigate('/', { replace: true }) })
        }
        isSubmitting={setup.isPending}
        errorMessage={setup.isError ? setup.error.message : undefined}
      />
    </div>
  )
}
