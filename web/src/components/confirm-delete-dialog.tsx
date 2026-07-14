import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export interface ConfirmDeleteDialogProps {
  /** Text of the button that opens the dialog. */
  triggerLabel: string
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  busy?: boolean
  triggerVariant?: 'destructive' | 'outline' | 'ghost'
  triggerSize?: 'default' | 'sm'
}

/**
 * A destructive action guarded by a confirmation. Presentational — it renders a
 * trigger button and an alert dialog; the container supplies `onConfirm`.
 */
export function ConfirmDeleteDialog({
  triggerLabel,
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  busy,
  triggerVariant = 'outline',
  triggerSize = 'sm',
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} disabled={busy}>
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={busy}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
