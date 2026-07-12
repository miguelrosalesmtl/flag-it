import { AlertCircleIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ErrorStateProps {
  /** Headline. Defaults to "Something went wrong". */
  title?: string
  /** Optional detail, e.g. the error message from a failed request. */
  message?: string
  /** Show a retry button that calls this. Omit it and the state is informational only. */
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center',
        className,
      )}
    >
      <AlertCircleIcon className="text-destructive size-6" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {message ? <p className="text-muted-foreground text-sm">{message}</p> : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
