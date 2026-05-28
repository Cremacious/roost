// src/lib/hooks/usePermissionGate.ts
'use client'

import { toast } from 'sonner'
import { useHousehold } from '@/lib/hooks/useHousehold'

/**
 * Canonical permission-key strings used across the app. These match the
 * dot-form strings emitted by /api/household/me (see the mapping in
 * src/app/api/household/me/route.ts) and exposed via useHousehold().permissions.
 */
export type PermissionKey =
  | 'expenses.view'
  | 'expenses.add'
  | 'chores.add'
  | 'chores.edit'
  | 'grocery.add'
  | 'grocery.create_list'
  | 'calendar.add'
  | 'calendar.edit'
  | 'tasks.add'
  | 'notes.add'
  | 'meals.plan'
  | 'meals.suggest'

export interface PermissionGate {
  /** True if the caller may perform this action. Admins always true. */
  allowed: boolean
  /** Click handler for a locked button. Fires the shared lock toast. */
  onBlocked: () => void
}

/**
 * Returns whether the current user may perform `permission`, and a click
 * handler to use when they cannot. The shared lock toast points users at
 * admin member settings so the restriction reads as configurable.
 *
 * Visual convention for callers (apply at the locked trigger):
 *   - Replace the leading icon with Lucide `Lock` at the same size.
 *   - Set `opacity: 0.55` and `cursor: 'not-allowed'`.
 *   - Set `aria-disabled="true"`. DO NOT use the HTML `disabled` attribute;
 *     it would suppress the click and the toast would never fire.
 *   - Route the click to `onBlocked` when `!allowed`.
 *
 * While the household query is loading the action is treated as locked.
 * That state is brief and avoids a click reaching a handler the server
 * would reject.
 */
export function usePermissionGate(permission: PermissionKey): PermissionGate {
  const { role, permissions, isLoading } = useHousehold()

  // Admins short-circuit, mirroring server-side checkMemberPermission.
  if (role === 'admin') {
    return { allowed: true, onBlocked: noop }
  }

  const allowed = !isLoading && permissions.includes(permission)

  return {
    allowed,
    onBlocked: () => {
      toast.error("You don't have permission to do that.", {
        description: 'Ask an admin to enable it in member settings.',
      })
    },
  }
}

function noop(): void {}
