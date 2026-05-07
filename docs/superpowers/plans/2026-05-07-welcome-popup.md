# Welcome Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a one-time modal to new users on their first visit to `/today` explaining 5 core features, dismissed permanently with "Got it!" via the existing `has_seen_welcome` DB field.

**Architecture:** `POST /api/user/dismiss-welcome` (new route, fire-and-forget) + `WelcomeModal` (shadcn Dialog, layout B: red header) mounted in `today/page.tsx`. Profile API already returns `has_seen_welcome`; modal is hidden immediately on local state and persisted async.

**Tech Stack:** Next.js 15 App Router, TypeScript, shadcn Dialog, Lucide icons, framer-motion, TanStack Query, better-auth

---

## File Map

| Action | File |
|---|---|
| Create | `apps/web/src/app/api/user/dismiss-welcome/route.ts` |
| Create | `apps/web/src/components/shared/WelcomeModal.tsx` |
| Modify | `apps/web/src/app/(app)/today/page.tsx` |

---

### Task 1: `POST /api/user/dismiss-welcome` route

**Files:**
- Create: `apps/web/src/app/api/user/dismiss-welcome/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// apps/web/src/app/api/user/dismiss-welcome/route.ts
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(): Promise<Response> {
  const session = await requireSession()

  await db
    .update(users)
    .set({ hasSeenWelcome: true })
    .where(eq(users.id, session.user.id))

  return Response.json({ ok: true })
}
```

- [ ] **Step 2: Verify the route compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "dismiss-welcome" | head -20
```

Expected: no output (no errors)

- [ ] **Step 3: Smoke test**

Start the dev server and run:
```bash
curl -X POST http://localhost:3000/api/user/dismiss-welcome \
  -H "Cookie: <your session cookie>"
```

Expected: `{"ok":true}` with status 200. Without a session: redirect to `/login`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/user/dismiss-welcome/route.ts
git commit -m "feat(api): add POST /api/user/dismiss-welcome route"
```

---

### Task 2: `WelcomeModal` component

**Files:**
- Create: `apps/web/src/components/shared/WelcomeModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
// apps/web/src/components/shared/WelcomeModal.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Baby,
  CheckSquare,
  DollarSign,
  LayoutGrid,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import RoostLogo from '@/components/shared/RoostLogo'

const FEATURES = [
  {
    icon: Users,
    color: '#EF4444',
    title: 'Invite your household',
    body: 'Share your code and family or roommates join instantly.',
  },
  {
    icon: Baby,
    color: '#3B82F6',
    title: 'Add child accounts',
    body: 'Kids get a 4-digit PIN login. No email, no finance access.',
  },
  {
    icon: CheckSquare,
    color: '#EF4444',
    title: 'Chores and rewards',
    body: 'Assign chores, track who did what, and set up automatic rewards for kids.',
  },
  {
    icon: DollarSign,
    color: '#22C55E',
    title: 'Split expenses',
    body: 'Track shared bills, scan receipts, and settle up.',
  },
  {
    icon: LayoutGrid,
    color: '#F59E0B',
    title: 'Meals, grocery, calendar and more',
    body: 'Everything else your household needs, in one place.',
  },
] as const

interface WelcomeModalProps {
  open: boolean
  onDismiss: () => void
}

export default function WelcomeModal({ open, onDismiss }: WelcomeModalProps) {
  const [dismissing, setDismissing] = useState(false)

  async function handleDismiss() {
    if (dismissing) return
    setDismissing(true)
    // Fire and forget — close immediately, persist in background
    fetch('/api/user/dismiss-welcome', { method: 'POST' }).catch(() => {})
    onDismiss()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent
        className="max-w-[calc(100vw-32px)] sm:max-w-[400px]"
        style={{
          backgroundColor: 'var(--roost-surface)',
          border: '1.5px solid var(--roost-border)',
          borderBottom: '4px solid #EF4444',
          borderRadius: 20,
          padding: 0,
          overflow: 'hidden',
        }}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Welcome to Roost</DialogTitle>
        <DialogDescription className="sr-only">
          A quick overview of what you can do in Roost.
        </DialogDescription>

        {/* Red header */}
        <div
          style={{
            background: '#EF4444',
            padding: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <RoostLogo variant="light" size="md" />
          <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>
            Welcome to Roost
          </p>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.75)',
              margin: 0,
            }}
          >
            Your household, all in one place
          </p>
        </div>

        {/* Feature list */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            background: '#ffffff',
          }}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: 0.05 + i * 0.05 }}
              style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: f.color + '1A', // 10% opacity
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <f.icon size={16} style={{ color: f.color }} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#111827',
                    margin: 0,
                    marginBottom: 2,
                  }}
                >
                  {f.title}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#6B7280',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {f.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Button */}
        <div style={{ padding: '0 24px 24px', background: '#ffffff' }}>
          <motion.button
            type="button"
            whileTap={{ y: 2 }}
            onClick={handleDismiss}
            disabled={dismissing}
            style={{
              width: '100%',
              height: 48,
              backgroundColor: '#EF4444',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              borderRadius: 12,
              border: 'none',
              borderBottom: '3px solid #C93B3B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Got it!
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify the component compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "WelcomeModal" | head -20
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/shared/WelcomeModal.tsx
git commit -m "feat(ui): add WelcomeModal component (layout B, red header)"
```

---

### Task 3: Integrate WelcomeModal into today/page.tsx

**Files:**
- Modify: `apps/web/src/app/(app)/today/page.tsx`

- [ ] **Step 1: Read the current today/page.tsx**

Read the full file before editing. The profile data needs to come from an API call. Check if the today page already fetches profile data.

```bash
grep -n "profile\|hasSeenWelcome\|has_seen_welcome\|WelcomeModal" apps/web/src/app/\(app\)/today/page.tsx
```

- [ ] **Step 2: Add imports and welcome state**

Add these imports at the top of `today/page.tsx`:

```typescript
import WelcomeModal from '@/components/shared/WelcomeModal'
```

Add this query inside the `TodayPage` component (after existing hooks):

```typescript
const [welcomeDismissed, setWelcomeDismissed] = useState(false)

const { data: profile } = useQuery<{ hasSeenWelcome: boolean; isChildAccount: boolean }>({
  queryKey: ['user-profile'],
  queryFn: async () => {
    const r = await fetch('/api/user/profile')
    if (!r.ok) throw new Error('Failed to load profile')
    return r.json()
  },
  staleTime: Infinity, // profile rarely changes mid-session
})

const showWelcome =
  !welcomeDismissed &&
  profile !== undefined &&
  profile.hasSeenWelcome === false &&
  profile.isChildAccount === false
```

- [ ] **Step 3: Add WelcomeModal to the JSX return**

Place `<WelcomeModal>` at the top level of the returned JSX (sibling to the main content, not inside it):

```tsx
return (
  <>
    <WelcomeModal
      open={showWelcome}
      onDismiss={() => setWelcomeDismissed(true)}
    />
    {/* existing page JSX */}
    ...
  </>
)
```

- [ ] **Step 4: Confirm profile API returns the needed fields**

The profile API (`GET /api/user/profile`) already returns `has_seen_welcome` mapped as `hasSeenWelcome`. Verify:

```bash
grep -n "has_seen_welcome\|hasSeenWelcome\|isChildAccount\|is_child_account" apps/web/src/app/api/user/profile/route.ts
```

Expected: both `hasSeenWelcome` and ideally `isChildAccount` are returned. If `isChildAccount` is missing from the profile response, add it:

Open `apps/web/src/app/api/user/profile/route.ts` and confirm the select includes:
```typescript
is_child_account: users.isChildAccount,
```
And the response maps it as `isChildAccount`. Add it if missing.

- [ ] **Step 5: Verify the page compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "today" | head -20
```

Expected: no output

- [ ] **Step 6: Manual test**

1. Sign up a fresh account and complete onboarding
2. Navigate to `/today`
3. Confirm the welcome modal appears with red header and 5 feature rows
4. Click "Got it!" — modal closes
5. Refresh the page — modal does NOT appear again
6. Open DevTools > Network — confirm `POST /api/user/dismiss-welcome` fired with 200

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\(app\)/today/page.tsx
git commit -m "feat: show WelcomeModal once on first /today visit"
```
