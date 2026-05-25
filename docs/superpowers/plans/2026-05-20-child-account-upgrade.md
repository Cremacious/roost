# Child Account Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin enable a child account to become a standard member, and let the child complete the conversion in their own session by setting an email and password, keeping all their history.

**Architecture:** A new `household_members.upgrade_allowed` flag is set by the admin (from the child's member sheet). When true, the child sees a banner that opens a sheet to set email + password. A self-serve endpoint converts the same account in place: adds a credential row, sets a real email, flips role child to member, clears the child flags, removes the PIN, and resets permissions to member defaults.

**Tech Stack:** Next.js 16 App Router API routes, Drizzle ORM + Neon, better-auth (credential accounts), TanStack Query, the existing DraggableSheet/MemberSheet UI patterns, Playwright for E2E.

**Spec:** `docs/superpowers/specs/2026-05-20-child-account-upgrade-design.md`

**Testing note:** This repo has no unit-test runner — only Playwright E2E (`npm run test:e2e`) plus `npx tsc --noEmit` and `npm run lint`. Each task is verified with typecheck + lint + a targeted manual/API check; one Playwright E2E task covers the admin-enable path and endpoint guards. The Neon HTTP driver does not support interactive transactions, so the conversion endpoint validates everything before any writes and then runs sequential writes (matching the existing `add-child` route).

**Conventions to follow:** Import section colors from `@/lib/constants/colors.ts`, theme colors via CSS vars, no emojis (Lucide icons only), no em dashes or double hyphens in any UI copy, touch targets 48px minimum, all sheets use `DraggableSheet`, toasts via `sonner`.

---

### Task 1: Add `upgrade_allowed` column to household_members

**Files:**
- Modify: `src/db/schema/members.ts`

- [ ] **Step 1: Add the column**

In `src/db/schema/members.ts`, add `upgradeAllowed` to the `householdMembers` table, right after the `pin` column:

```typescript
export const householdMembers = pgTable('household_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member').$type<'admin' | 'member' | 'guest' | 'child'>(),
  pin: text('pin'),
  upgradeAllowed: boolean('upgrade_allowed').notNull().default(false),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})
```

`boolean` is already imported at the top of the file (the `memberPermissions` table uses it).

- [ ] **Step 2: Push the schema to Neon**

Run: `npm run db:push`
Expected: drizzle-kit reports the `household_members.upgrade_allowed` column added, no errors. If it prompts, accept the additive change.

- [ ] **Step 3: Verify the column exists**

Run: `npx tsc --noEmit`
Expected: no new errors (pre-existing `MemberSheet.tsx` "member possibly null" errors may remain; ignore those).

- [ ] **Step 4: Commit**

```bash
git add src/db/schema/members.ts
git commit -m "feat: add upgrade_allowed column to household_members"
```

---

### Task 2: Admin endpoint to enable/disable the upgrade

**Files:**
- Create: `src/app/api/household/members/[id]/allow-upgrade/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { type NextRequest } from 'next/server'
import { requireSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

// Admin sets whether a child member is allowed to self-upgrade to a full account.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  const session = await requireSession()
  const householdData = await getUserHousehold(session.user.id)

  if (!householdData) return Response.json({ error: 'No household' }, { status: 403 })
  if (householdData.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 })

  const { householdId } = householdData

  const body = await request.json().catch(() => null)
  if (!body || typeof body.allowed !== 'boolean') {
    return Response.json({ error: 'Body must include boolean "allowed"' }, { status: 400 })
  }

  const [target] = await db
    .select({ id: householdMembers.id, role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.id, id),
        eq(householdMembers.householdId, householdId),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!target) return Response.json({ error: 'Member not found' }, { status: 404 })
  if (target.role !== 'child') {
    return Response.json({ error: 'Only child accounts can be allowed to upgrade' }, { status: 400 })
  }

  await db
    .update(householdMembers)
    .set({ upgradeAllowed: body.allowed })
    .where(eq(householdMembers.id, id))

  return Response.json({ ok: true, upgradeAllowed: body.allowed })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verify (after the UI exists you can use the sheet; for now confirm it compiles and lints)**

Run: `npm run lint`
Expected: no errors for the new file.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/household/members/[id]/allow-upgrade/route.ts"
git commit -m "feat: admin endpoint to allow a child to upgrade"
```

---

### Task 3: Expose `upgradeAllowed` to the admin list and the child

**Files:**
- Modify: `src/app/api/household/members/route.ts` (admin list)
- Modify: `src/app/api/household/me/route.ts` (child gate)
- Modify: `src/lib/hooks/useHousehold.ts`

- [ ] **Step 1: Add `upgradeAllowed` to the members GET select and response**

In `src/app/api/household/members/route.ts`, add `upgradeAllowed` to the `.select({...})` for `members`:

```typescript
      id: householdMembers.id,
      userId: householdMembers.userId,
      role: householdMembers.role,
      joinedAt: householdMembers.createdAt,
      expiresAt: householdMembers.expiresAt,
      upgradeAllowed: householdMembers.upgradeAllowed,
      name: users.name,
```

Then include it in the mapped response object:

```typescript
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.name,
      email: m.email ?? null,
      avatarColor: m.avatarColor,
      role: m.role,
      joinedAt: m.joinedAt?.toISOString() ?? null,
      expiresAt: m.expiresAt?.toISOString() ?? null,
      upgradeAllowed: m.upgradeAllowed,
      permissions: {
        ...(DEFAULT_PERMISSIONS[m.role] ?? DEFAULT_PERMISSIONS.member),
        ...(m.permissions ?? {}),
      },
    })),
```

- [ ] **Step 2: Add `upgradeAllowed` to the `/api/household/me` response**

In `src/app/api/household/me/route.ts`, add `upgradeAllowed` to the membership select:

```typescript
  const [membership] = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
      upgradeAllowed: householdMembers.upgradeAllowed,
    })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, userId), isNull(householdMembers.deletedAt)))
    .orderBy(desc(householdMembers.createdAt))
    .limit(1);
```

Then add it to the final response:

```typescript
  return Response.json({ household, role: membership.role, permissions, upgradeAllowed: membership.upgradeAllowed });
```

- [ ] **Step 3: Surface it in the `useHousehold` hook**

In `src/lib/hooks/useHousehold.ts`, add `upgradeAllowed` to the `HouseholdData` interface:

```typescript
interface HouseholdData {
  household: {
    id: string;
    name: string;
    code: string;
    subscription_status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    premium_expires_at: string | null;
    stats_visibility: string | null;
  };
  role: string;
  permissions: string[];
  upgradeAllowed?: boolean;
}
```

And return it from the hook (add to the returned object):

```typescript
    permissions: data?.permissions ?? [],
    upgradeAllowed: data?.upgradeAllowed ?? false,
    isPremium,
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/household/members/route.ts src/app/api/household/me/route.ts src/lib/hooks/useHousehold.ts
git commit -m "feat: expose upgradeAllowed to member list and household hook"
```

---

### Task 4: Child self-upgrade conversion endpoint

**Files:**
- Create: `src/app/api/user/upgrade-account/route.ts`

- [ ] **Step 1: Create the conversion route**

```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { user as authUser, account, users, households, householdMembers, memberPermissions } from '@/db/schema'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

// Free households allow at most this many non-child members (mirrors
// packages/constants/src/limits.ts FREE_TIER_LIMITS.members). The app does not
// import that workspace package today, so the value is duplicated here.
const FREE_MEMBER_LIMIT = 5

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Standard member permission defaults (mirror src/db/schema/members.ts).
const MEMBER_PERMS = {
  expensesView: true,
  expensesAdd: true,
  choresAdd: false,
  choresEdit: false,
  groceryAdd: true,
  groceryCreateList: false,
  calendarAdd: true,
  calendarEdit: false,
  tasksAdd: true,
  notesAdd: true,
  mealsPlan: true,
  mealsSuggest: true,
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const body = await request.json().catch(() => ({})) as { email?: string; password?: string }
  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }
  if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json(
      { error: 'Password must be 8+ characters with an uppercase letter and a number' },
      { status: 400 },
    )
  }

  // Caller must be a child account.
  const [appUser] = await db
    .select({ isChildAccount: users.isChildAccount })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!appUser?.isChildAccount) {
    return NextResponse.json({ error: 'This account cannot be upgraded' }, { status: 400 })
  }

  // Membership must exist and have upgrade enabled by an admin.
  const [membership] = await db
    .select({
      id: householdMembers.id,
      householdId: householdMembers.householdId,
      upgradeAllowed: householdMembers.upgradeAllowed,
    })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, userId), isNull(householdMembers.deletedAt)))
    .limit(1)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })
  if (!membership.upgradeAllowed) {
    return NextResponse.json({ error: 'Upgrade is not enabled. Ask an admin to allow it.' }, { status: 403 })
  }

  // Email must be unique across all users.
  const [emailTaken] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(and(eq(authUser.email, email), ne(authUser.id, userId)))
    .limit(1)
  if (emailTaken) {
    return NextResponse.json({ error: 'That email is already in use' }, { status: 409 })
  }

  // Free-tier member limit: count current non-child members in the household.
  const nonChildMembers = await db
    .select({ role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, membership.householdId),
        isNull(householdMembers.deletedAt),
        ne(householdMembers.role, 'child'),
      )
    )
  const [hh] = await db
    .select({ status: households.subscription_status })
    .from(households)
    .where(eq(households.id, membership.householdId))
    .limit(1)
  const isFree = hh?.status !== 'premium'
  if (isFree && nonChildMembers.length >= FREE_MEMBER_LIMIT) {
    return NextResponse.json(
      { error: 'Your household is full. Upgrade to premium or remove a member to free a spot.', code: 'MEMBERS_LIMIT' },
      { status: 403 },
    )
  }

  // --- Conversion (validated above; sequential writes, Neon HTTP has no interactive tx) ---
  const now = new Date()
  const hashed = await hashPassword(password)

  // 1. Real email + verified, on both auth user and app users.
  await db.update(authUser).set({ email, emailVerified: true, updatedAt: now }).where(eq(authUser.id, userId))
  await db.update(users).set({ email, isChildAccount: false, childOfHouseholdId: null, updatedAt: now }).where(eq(users.id, userId))

  // 2. Credential account (only if one does not already exist).
  const [existingCred] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    .limit(1)
  if (!existingCred) {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    })
  } else {
    await db.update(account).set({ password: hashed, updatedAt: now }).where(eq(account.id, existingCred.id))
  }

  // 3. Membership: become a member, drop PIN, clear the flag.
  await db
    .update(householdMembers)
    .set({ role: 'member', pin: null, upgradeAllowed: false })
    .where(eq(householdMembers.id, membership.id))

  // 4. Reset permissions to member defaults.
  const [perms] = await db
    .select({ id: memberPermissions.id })
    .from(memberPermissions)
    .where(and(eq(memberPermissions.userId, userId), eq(memberPermissions.householdId, membership.householdId)))
    .limit(1)
  if (perms) {
    await db.update(memberPermissions).set({ ...MEMBER_PERMS, updatedAt: now }).where(eq(memberPermissions.id, perms.id))
  } else {
    await db.insert(memberPermissions).values({ householdId: membership.householdId, userId, ...MEMBER_PERMS })
  }

  return NextResponse.json({ ok: true, email })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (`ne`, `households`, `account`, `authUser` are all imported in the route above.)

- [ ] **Step 3: Manual verify with the seeded child**

Run: `npm run db:seed` (ensures a fresh Test Child exists), then start the dev server. For the happy path: as the free admin enable upgrade on the Test Child, then sign in as the child by PIN and POST to `/api/user/upgrade-account` with a valid email + password. Expected: 200 `{ ok: true }`, and the member now has role `member`. (The E2E task automates the guard checks.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/user/upgrade-account/route.ts
git commit -m "feat: child self-upgrade conversion endpoint"
```

---

### Task 5: Admin UI - "Allow upgrade" section in MemberSheet

**Files:**
- Modify: `src/components/settings/MemberSheet.tsx`
- Modify: `src/app/(app)/household/page.tsx` (pass `upgradeAllowed` into the sheet member)

- [ ] **Step 1: Add `upgradeAllowed` to the `SheetMember` type**

In `src/components/settings/MemberSheet.tsx`, add to the `SheetMember` interface:

```typescript
export interface SheetMember {
  id: string
  userId: string
  name: string
  email: string | null
  role: string
  avatarColor: string | null
  joinedAt: string | null
  expiresAt?: string | null
  upgradeAllowed?: boolean
  permissions: MemberPermissions
}
```

- [ ] **Step 2: Add local state + handler in MemberSheet**

Inside the `MemberSheet` component, add state near the other hooks (after `permissionsLoading`):

```typescript
  const [upgradeAllowed, setUpgradeAllowed] = useState(false)
  const [upgradeSaving, setUpgradeSaving] = useState(false)
```

In the existing `useEffect` that resets on member change, add:

```typescript
  useEffect(() => {
    setPin('')
    setShowPin(false)
    setPermissions(member?.permissions ?? null)
    setUpgradeAllowed(member?.upgradeAllowed ?? false)
  }, [member])
```

Add the handler (after `handleUpdatePin`):

```typescript
  async function handleToggleUpgrade(next: boolean) {
    setUpgradeSaving(true)
    setUpgradeAllowed(next) // optimistic
    try {
      const res = await fetch(`/api/household/members/${member!.id}/allow-upgrade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to update')
      }
      toast.success(next ? 'Upgrade enabled' : 'Upgrade turned off')
      onRefetch()
    } catch (err) {
      setUpgradeAllowed(!next) // revert
      toast.error('Could not update upgrade setting', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setUpgradeSaving(false)
    }
  }
```

- [ ] **Step 3: Render the section (children only), above the PIN section**

Add this block immediately before the `{isChild && (` PIN block:

```tsx
          {isChild && (
            <div style={DIVIDER_STYLE}>
              <span style={SECTION_LABEL_STYLE}>Upgrade to a full account</span>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)', lineHeight: 1.5 }}>
                This lets {member.name} set their own email and password and become a full member. They keep all their
                chores, points, and history. As a member they will also be able to see household expenses.
              </p>
              <ToggleRow
                checked={upgradeAllowed}
                label={`Allow ${member.name} to upgrade`}
                description={
                  upgradeAllowed
                    ? `Upgrade enabled. Waiting for ${member.name} to finish from their own login.`
                    : 'Turn this on so they can set up their own account.'
                }
                onChange={(v) => { if (!upgradeSaving) handleToggleUpgrade(v) }}
              />
            </div>
          )}
```

(`ToggleRow` is already defined in this file. `DIVIDER_STYLE`, `SECTION_LABEL_STYLE` are already defined.)

- [ ] **Step 4: Confirm `upgradeAllowed` flows into the sheet from the household page**

In `src/app/(app)/household/page.tsx`, the page's `HouseholdData` interface (around line 42) types its members directly as `SheetMember[]`:

```typescript
interface HouseholdData {
  household: { id: string; name: string; code: string }
  role: string
  members: SheetMember[]
}
```

The members come straight from the `/api/household/members` response (no per-field re-mapping), and `gearMember` is set from that array. So once Task 3 adds `upgradeAllowed` to the API response and Task 5 Step 1 adds it to the `SheetMember` type, the field flows through to `MemberSheet` automatically. No code change is required here.

Run: `npx tsc --noEmit`
Expected: no new errors. (If TypeScript reports `upgradeAllowed` missing on a constructed `SheetMember` somewhere, add `upgradeAllowed: false` there — but with the direct pass-through above this should not happen.)

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/MemberSheet.tsx "src/app/(app)/household/page.tsx"
git commit -m "feat: admin can allow a child to upgrade from the member sheet"
```

---

### Task 6: Child UI - upgrade banner + sheet

**Files:**
- Create: `src/components/account/UpgradeAccountSheet.tsx`
- Create: `src/components/account/UpgradeAccountBanner.tsx`
- Modify: `src/app/(app)/today/page.tsx` (mount the banner)

- [ ] **Step 1: Create the upgrade sheet**

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = '#3B82F6'
const COLOR_DARK = '#1A5CB5'

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: '#374151', marginBottom: 6,
}
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', height: 48, fontSize: 16, fontWeight: 600, padding: '0 14px',
  border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)',
  borderRadius: 12, background: 'var(--roost-surface)', color: 'var(--roost-text-primary)', outline: 'none',
}

export function UpgradeAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const weak = password.length > 0 && (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
  const mismatch = confirm.length > 0 && confirm !== password

  async function handleSubmit() {
    if (!email.trim()) { toast.error('Enter an email', { description: 'You will use it to sign in.' }); return }
    if (weak) { toast.error('Password too weak', { description: 'Use 8+ characters with an uppercase letter and a number.' }); return }
    if (password !== confirm) { toast.error('Passwords do not match', { description: 'Re-enter the same password.' }); return }
    setLoading(true)
    try {
      const res = await fetch('/api/user/upgrade-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not upgrade your account')
      toast.success('You are all set', { description: 'From now on, sign in with your email and password.' })
      qc.invalidateQueries({ queryKey: ['household'] })
      qc.invalidateQueries({ queryKey: ['user-profile'] })
      onClose()
    } catch (err) {
      toast.error('Upgrade failed', { description: err instanceof Error ? err.message : 'Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          Upgrade to a full account
        </p>
        <p style={{ margin: '0 0 18px', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', lineHeight: 1.5 }}>
          Set an email and password to become a full member. You keep everything you have already done.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={LABEL_STYLE}>Email</label>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" style={INPUT_STYLE} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={LABEL_STYLE}>Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters"
              style={{ ...INPUT_STYLE, paddingRight: 40 }} />
            <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--roost-text-muted)', display: 'flex', padding: 4 }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {weak && <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 700, color: '#EF4444' }}>Use 8+ characters with an uppercase letter and a number.</p>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={LABEL_STYLE}>Confirm password</label>
          <input type={showPw ? 'text' : 'password'} autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" style={INPUT_STYLE} />
          {mismatch && <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 700, color: '#EF4444' }}>Passwords do not match.</p>}
        </div>

        <motion.button whileTap={{ y: 1 }} type="button" onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', borderBottom: `4px solid ${COLOR_DARK}`,
            background: COLOR, color: '#fff', fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Setting up...' : 'Create my account'}
        </motion.button>
      </div>
    </DraggableSheet>
  )
}
```

- [ ] **Step 2: Create the banner**

```tsx
'use client'

import { useState } from 'react'
import { ArrowUpCircle } from 'lucide-react'
import { useHousehold } from '@/lib/hooks/useHousehold'
import { UpgradeAccountSheet } from './UpgradeAccountSheet'

const COLOR = '#3B82F6'
const COLOR_DARK = '#1A5CB5'

export function UpgradeAccountBanner() {
  const { role, upgradeAllowed } = useHousehold()
  const [open, setOpen] = useState(false)

  if (role !== 'child' || !upgradeAllowed) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)',
          borderBottom: `4px solid ${COLOR_DARK}`, borderRadius: 16, padding: '14px 16px', marginBottom: 16,
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 11, background: `${COLOR}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArrowUpCircle size={20} color={COLOR} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)' }}>Ready for your own account?</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>Set an email and password to become a full member.</p>
        </div>
      </button>
      <UpgradeAccountSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}
```

- [ ] **Step 3: Mount the banner on the Today page**

In `src/app/(app)/today/page.tsx`, add the import near the other component imports:

```typescript
import { UpgradeAccountBanner } from '@/components/account/UpgradeAccountBanner'
```

Then render `<UpgradeAccountBanner />` inside the loaded-state `<motion.div>` (the one with `maxWidth: 768` around line 132), immediately after the date label `<p>{dateLabel}</p>` and before `<HeroCard ... />`:

```tsx
        <p style={{ fontSize: 11, fontWeight: 800, color: '#9B9590', letterSpacing: '0.08em', margin: 0 }}>
          {dateLabel}
        </p>

        <UpgradeAccountBanner />

        <HeroCard
          type={data.hero.type}
          item={data.hero.item}
          onCompleteChore={id => completeMutation.mutate(id)}
        />
```

The component renders nothing unless the viewer is a child with upgrade enabled, so it is safe to always mount.

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/account/UpgradeAccountSheet.tsx src/components/account/UpgradeAccountBanner.tsx "src/app/(app)/today/page.tsx"
git commit -m "feat: child-facing upgrade banner and sheet"
```

---

### Task 7: E2E test - admin enable path and endpoint guards

**Files:**
- Create: `e2e/child-upgrade.spec.ts`

This test uses the free admin storage state to create a throwaway child, enable upgrade, and assert the flag flows through the members API. It also asserts the conversion endpoint rejects a non-allowed / non-child caller. It does not drive the full child PIN session (covered by manual verification) to keep the test reliable.

- [ ] **Step 1: Write the test**

```typescript
import { test, expect } from '@playwright/test'

// Runs under the "free" project (storageState = free admin).
test('admin can enable child upgrade and the flag flows through the API', async ({ request }) => {
  const suffix = Date.now()
  // 1. Create a throwaway child as the admin.
  const createRes = await request.post('/api/household/members/add-child', {
    data: { name: `Upgrade Kid ${suffix}`, pin: '4321' },
  })
  expect(createRes.ok()).toBeTruthy()

  // 2. Find the child's member id from the members list.
  const listRes = await request.get('/api/household/members')
  expect(listRes.ok()).toBeTruthy()
  const list = await listRes.json()
  const child = list.members.find((m: { name: string }) => m.name === `Upgrade Kid ${suffix}`)
  expect(child).toBeTruthy()
  expect(child.upgradeAllowed).toBe(false)

  // 3. Enable upgrade.
  const allowRes = await request.patch(`/api/household/members/${child.id}/allow-upgrade`, {
    data: { allowed: true },
  })
  expect(allowRes.ok()).toBeTruthy()

  // 4. Verify the flag flipped.
  const list2 = await (await request.get('/api/household/members')).json()
  const child2 = list2.members.find((m: { name: string }) => m.name === `Upgrade Kid ${suffix}`)
  expect(child2.upgradeAllowed).toBe(true)

  // 5. The admin (not a child) cannot call the conversion endpoint.
  const convertRes = await request.post('/api/user/upgrade-account', {
    data: { email: `kid${suffix}@example.com`, password: 'StrongPass1' },
  })
  expect(convertRes.status()).toBe(400)
})
```

- [ ] **Step 2: Run the test**

Run: `npm run test:e2e -- child-upgrade`
Expected: PASS. If the run cannot find seeded auth state, run `npm run db:seed` first, then re-run. (The free-admin storage state is produced by `e2e/global-setup.ts`.)

- [ ] **Step 3: Commit**

```bash
git add e2e/child-upgrade.spec.ts
git commit -m "test: e2e for child upgrade enable path and endpoint guard"
```

---

### Task 8: Full manual verification + docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Reseed and run the full flow manually**

Run: `npm run db:seed`
Then with the dev server running:
1. Sign in as `admin.free@roost.test` / `RoostTest123!`.
2. Household page, open Test Child, turn on "Allow Test Child to upgrade." Confirm the waiting state shows.
3. Sign out. Sign in as the child (child login, code `FREEHS`, Test Child, PIN `1234`).
4. On Today, the upgrade banner appears. Open it, set email `testchild@example.com` and password `RoostTest123!`, confirm, submit. Expect success toast.
5. Sign out, sign in with `testchild@example.com` / `RoostTest123!`. Expect to land in the app as a member (finance visible).

Expected: all steps succeed; the child's prior data is intact.

- [ ] **Step 2: Verify edge cases manually**

- Email collision: try upgrading with `member@roost.test`. Expect "That email is already in use."
- Revoke: enable, then disable from the member sheet before the child submits; the child's submit returns "Upgrade is not enabled."

- [ ] **Step 3: Document the feature in CLAUDE.md**

Add a short subsection under the Account Roles / Onboarding area describing: the `household_members.upgrade_allowed` flag, the admin enable endpoint `PATCH /api/household/members/[id]/allow-upgrade`, the child conversion endpoint `POST /api/user/upgrade-account` (child-only, requires upgrade_allowed, converts in place: role member, credential added, PIN removed, isChildAccount false, permissions reset to member defaults), the admin entry point (child member sheet) and child entry point (Today banner + UpgradeAccountSheet), and that the converted child counts against the free 5-member limit.

- [ ] **Step 4: Final gate**

Run: `npx tsc --noEmit && npm run lint && npm run test:e2e -- child-upgrade`
Expected: typecheck clean (except pre-existing MemberSheet null warnings), lint clean, E2E passes.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document child account upgrade feature"
```

---

## Notes for the implementer

- Same user id is kept throughout the conversion, so chore completions, points, streaks, and all history stay attached.
- The Neon HTTP driver has no interactive transactions; the conversion validates everything before writing and then writes sequentially, matching the existing `add-child` route. If a write fails midway, the email-uniqueness and limit checks already passed, so a re-run by the child is safe (email/credential/permission steps are idempotent via the existence checks).
- Do not set a password on the child's behalf anywhere. Only the child, in their own session, provides the password.
- Keep all UI copy free of emojis, em dashes, and double hyphens.
