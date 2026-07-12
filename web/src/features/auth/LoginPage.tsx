import { useNavigate } from 'react-router'

import { LoginForm } from '@/features/auth/components/LoginForm'
import { useLogin } from '@/features/auth/hooks/useAuth'

/**
 * Container. Pairs the login mutation with the form and, on success, sends the
 * user to the app. The guards handle everyone who is already signed in.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <LoginForm
        onSubmit={(input) =>
          login.mutate(input, { onSuccess: () => void navigate('/', { replace: true }) })
        }
        isSubmitting={login.isPending}
        errorMessage={login.isError ? login.error.message : undefined}
      />
    </div>
  )
}
