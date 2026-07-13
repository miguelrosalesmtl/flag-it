import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface UserMenuProps {
  /** The signed-in user (undefined while loading). */
  user?: { email: string; full_name: string }
  /** Called when "Sign out" is chosen. */
  onSignOut: () => void
}

/** Two-letter initials from a name (or the email as a fallback). */
function initials(user?: { email: string; full_name: string }): string {
  if (!user) return '?'
  const name = user.full_name.trim()
  if (name) {
    const parts = name.split(/\s+/)
    return ((parts[0]?.charAt(0) ?? '') + (parts[1]?.charAt(0) ?? '')).toUpperCase()
  }
  return user.email.slice(0, 2).toUpperCase()
}

/**
 * Presentational. A circular avatar showing the user's initials; clicking it
 * opens a menu with Sign out.
 */
export function UserMenu({ user, onSignOut }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account"
          className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full text-sm font-medium"
        >
          {initials(user)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {user ? (
          <>
            <DropdownMenuLabel className="truncate font-normal">{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onSelect={onSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
