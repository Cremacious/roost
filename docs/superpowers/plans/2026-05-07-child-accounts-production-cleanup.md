# Child Accounts + Production Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make child accounts fully functional in apps/web: add-child flow, API routes, child-login page, settings discoverability, and member management. Also clean up dead routes and add privacy/terms placeholder pages.

**Architecture:** Port the V1 child account system (root `src/`) to apps/web. Schema needs a `pin` column on `householdMembers`. Child auth uses better-auth's internal adapter to create sessions without email/password. Better-call's `serializeSignedCookie` signs the session cookie. All table names in apps/web use camelCase (e.g. `householdMembers`, `userId`) unlike V1's snake_case.

**Tech Stack:** Next.js 15 App Router, TypeScript, Drizzle ORM + Neon, better-auth 1.5.x, better-call (transitive dep of better-auth), shadcn, framer-motion, TanStack Query

---

## File Map

| Action | File |
|---|---|
| Modify (schema) | `apps/web/src/db/schema/members.ts` |
| Create | `apps/web/src/app/api/household/members/add-child/route.ts` |
| Modify | `apps/web/src/components/settings/AddChildSheet.tsx` |
| Create | `apps/web/src/app/api/auth/child-login/route.ts` |
| Create | `apps/web/src/app/(auth)/child-login/page.tsx` |
| Modify | `apps/web/src/app/(app)/settings/page.tsx` (callout section) |
| Create | `apps/web/src/app/api/household/members/[id]/route.ts` |
| Create | `apps/web/src/app/api/household/members/[id]/pin/route.ts` |
| Modify | `apps/web/src/components/settings/MemberSheet.tsx` |
| Delete | `apps/web/src/app/(app)/food/` (entire directory) |
| Create | `apps/web/src/app/privacy/page.tsx` |
| Create | `apps/web/src/app/terms/page.tsx` |

---

### Task 1: Add `pin` column to `householdMembers` schema

**Files:**
- Modify: `apps/web/src/db/schema/members.ts`

The `householdMembers` table in apps/web has no `pin` column. Child accounts need it.

- [ ] **Step 1: Add the `pin` column**

Open `apps/web/src/db/schema/members.ts` and add `pin` to `householdMembers`:

```typescript
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const householdMembers = pgTable('household_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member').$type<'admin' | 'member' | 'guest' | 'child'>(),
  pin: text('pin'),  // hashed 4-digit PIN, child accounts only
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const memberPermissions = pgTable('member_permissions', {
  // ... unchanged
})
```

- [ ] **Step 2: Push schema to Neon**

```bash
cd apps/web && npm run db:push
```

Expected output: confirmation that `household_members.pin` column was added (or already exists). No errors.

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "members" | head -10
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/db/schema/members.ts
git commit -m "feat(schema): add pin column to household_members for child accounts"
```

---

### Task 2: `POST /api/household/members/add-child` route

**Files:**
- Create: `apps/web/src/app/api/household/members/add-child/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// apps/web/src/app/api/household/members/add-child/route.ts
import { requireSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { user, users, householdMembers, memberPermissions } from '@/db/schema'
import { hashPassword } from 'better-auth/crypto'
import { eq } from 'drizzle-orm'

export async function POST(request: Request): Promise<Response> {
  const session = await requireSession()

  const membership = await getUserHousehold(session.user.id)
  if (!membership) {
    return Response.json({ error: 'No household found' }, { status: 404 })
  }
  if (membership.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { householdId } = membership

  let body: { name?: string; pin?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name || name.length > 32) {
    return Response.json(
      { error: 'Name is required and must be 32 characters or fewer' },
      { status: 400 }
    )
  }

  const rawPin = body.pin
  if (!rawPin || !/^\d{4}$/.test(rawPin)) {
    return Response.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
  }

  try {
    const hashedPin = await hashPassword(rawPin)
    const userId = crypto.randomUUID()
    const placeholderEmail = `child_${userId}@roost.internal`

    // Insert into better-auth user table first (session FK requires this)
    await db.insert(user).values({
      id: userId,
      name,
      email: placeholderEmail,
      emailVerified: false,
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing()

    // Insert into app users table
    await db.insert(users).values({
      id: userId,
      name,
      email: null,
      isChildAccount: true,
      childOfHouseholdId: householdId,
      onboardingCompleted: true,
      hasSeenWelcome: true, // children skip welcome modal
      theme: 'default',
      language: 'en',
    })

    // Add household membership with role=child and hashed PIN
    await db.insert(householdMembers).values({
      householdId,
      userId,
      role: 'child',
      pin: hashedPin,
    })

    // Add member permissions with child-safe defaults
    await db.insert(memberPermissions).values({
      householdId,
      userId,
      expensesView: false,
      expensesAdd: false,
      choresAdd: false,
      choresEdit: false,
      groceryAdd: true,
      groceryCreateList: false,
      calendarAdd: false,
      calendarEdit: false,
      tasksAdd: false,
      notesAdd: false,
      mealsPlan: false,
      mealsSuggest: true,
    })

    return Response.json({ child: { id: userId, name }, pin: rawPin }, { status: 201 })
  } catch (error) {
    console.error('[add-child] error:', error)
    return Response.json({ error: 'Failed to create child account' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Check that `users` table has all inserted fields**

Verify `apps/web/src/db/schema/users.ts` has: `isChildAccount`, `childOfHouseholdId`, `hasSeenWelcome`, `onboardingCompleted`, `theme`, `language`. Run:

```bash
grep -n "isChildAccount\|childOfHouseholdId\|hasSeenWelcome\|onboardingCompleted\|theme\|language" apps/web/src/db/schema/users.ts
```

All 6 should appear. If any are missing, add them to the schema and run `npm run db:push` again.

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "add-child" | head -10
```

Expected: no errors

- [ ] **Step 4: Smoke test**

With the dev server running and an admin session:
```bash
curl -X POST http://localhost:3000/api/household/members/add-child \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin session cookie>" \
  -d '{"name":"Emma","pin":"1234"}'
```

Expected: `{"child":{"id":"...","name":"Emma"},"pin":"1234"}` with status 201.

Try without a session — expected: redirect to `/login`.
Try with `pin: "abc"` — expected: `{"error":"PIN must be exactly 4 digits"}` with status 400.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/household/members/add-child/route.ts
git commit -m "feat(api): add POST /api/household/members/add-child route"
```

---

### Task 3: `AddChildSheet` — full implementation

**Files:**
- Modify: `apps/web/src/components/settings/AddChildSheet.tsx`

Replace the "coming soon" placeholder with the full 2-step form.

- [ ] **Step 1: Replace AddChildSheet with the full implementation**

```typescript
// apps/web/src/components/settings/AddChildSheet.tsx
'use client'

import { useState } from 'react'
import { Copy, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

interface AddChildSheetProps {
  open: boolean
  onClose: () => void
}

export default function AddChildSheet({ open, onClose }: AddChildSheetProps) {
  const queryClient = useQueryClient()

  const [step, setStep] = useState<'form' | 'success'>('form')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createdName, setCreatedName] = useState('')
  const [createdPin, setCreatedPin] = useState('')
  const [copied, setCopied] = useState(false)

  const trimmedName = name.trim()
  const pinValid = /^\d{4}$/.test(pin)
  const canSubmit = trimmedName.length > 0 && pinValid && !saving

  function handleClose() {
    onClose()
    setTimeout(() => {
      setStep('form')
      setName('')
      setPin('')
      setShowPin(false)
      setSaving(false)
      setCreatedName('')
      setCreatedPin('')
      setCopied(false)
    }, 300)
  }

  function handlePinChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    setPin(digits)
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    try {
      const r = await fetch('/api/household/members/add-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, pin }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { error?: string }
        toast.error(body.error ?? 'Failed to create child account.', {
          description: 'Check that you have not reached your account limit.',
        })
        return
      }
      const data = await r.json() as { child: { name: string }; pin: string }
      setCreatedName(data.child.name)
      setCreatedPin(data.pin)
      setStep('success')
      queryClient.invalidateQueries({ queryKey: ['household-members'] })
    } catch {
      toast.error('Something went wrong.', {
        description: 'Check your connection and try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(createdPin).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 48,
    border: '1.5px solid var(--roost-border)',
    borderBottom: '3px solid var(--roost-border-bottom)',
    borderRadius: 12,
    backgroundColor: 'var(--roost-surface)',
    color: 'var(--roost-text-primary)',
    fontSize: 15,
    fontWeight: 700,
    padding: '0 14px',
    outline: 'none',
    boxSizing: 'border-box',
    display: 'block',
  }

  const labelStyle: React.CSSProperties = {
    color: '#374151',
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  }

  return (
    <DraggableSheet
      open={open}
      onOpenChange={(v: boolean) => { if (!v) handleClose() }}
      featureColor="#3B82F6"
    >
      <div className="px-4 pb-8">
        {step === 'form' ? (
          <>
            <p className="mb-2 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
              Add a child account
            </p>
            <p className="mb-5 text-sm" style={{ color: 'var(--roost-text-secondary)', fontWeight: 600, lineHeight: 1.5 }}>
              Child accounts log in with a 4-digit PIN. No email address needed.
            </p>

            <label className="mb-1 block text-sm" style={labelStyle}>
              Child&apos;s name
            </label>
            <input
              type="text"
              maxLength={32}
              placeholder="e.g. Emma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 20 }}
            />

            <label className="mb-1 block text-sm" style={labelStyle}>
              Choose a 4-digit PIN
            </label>
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
                style={{
                  ...inputStyle,
                  letterSpacing: '0.25em',
                  fontFamily: 'monospace',
                  fontSize: 22,
                  fontWeight: 900,
                  paddingRight: 48,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: 'var(--roost-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mb-5 text-xs" style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}>
              Your child will use this PIN to log in
            </p>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: '100%',
                height: 52,
                backgroundColor: canSubmit ? '#3B82F6' : 'var(--roost-border)',
                color: canSubmit ? 'white' : 'var(--roost-text-muted)',
                fontWeight: 800,
                fontSize: 15,
                borderRadius: 14,
                border: 'none',
                borderBottom: `3px solid ${canSubmit ? '#1A5CB5' : 'var(--roost-border-bottom)'}`,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} />
                  Create account
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
              Account created!
            </p>
            <p className="mb-5 text-sm" style={{ color: 'var(--roost-text-secondary)', fontWeight: 600 }}>
              {createdName} can now log in at the child login screen.
            </p>

            <div
              className="mb-4 flex flex-col items-center rounded-2xl p-6"
              style={{
                backgroundColor: 'var(--roost-bg)',
                border: '1.5px solid var(--roost-border)',
                borderBottom: '4px solid var(--roost-border-bottom)',
              }}
            >
              <p
                className="mb-1 text-xs uppercase tracking-widest"
                style={{ color: 'var(--roost-text-muted)', fontWeight: 700 }}
              >
                {createdName}&apos;s PIN
              </p>
              <p
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  letterSpacing: '0.25em',
                  color: '#3B82F6',
                  fontFamily: 'monospace',
                  lineHeight: 1.2,
                  marginBottom: 8,
                }}
              >
                {createdPin}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: copied ? '#22C55E' : '#3B82F6',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                <Copy size={14} />
                {copied ? 'Copied!' : 'Copy PIN'}
              </button>
            </div>

            <div
              className="mb-5 rounded-xl px-4 py-3"
              style={{
                backgroundColor: '#EFF6FF',
                border: '1.5px solid #BFDBFE',
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF', lineHeight: 1.5 }}>
                Save this PIN. You can change it later in Settings by tapping {createdName} under Members.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              style={{
                width: '100%',
                height: 52,
                backgroundColor: '#3B82F6',
                color: 'white',
                fontWeight: 800,
                fontSize: 15,
                borderRadius: 14,
                border: 'none',
                borderBottom: '3px solid #1A5CB5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </DraggableSheet>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "AddChildSheet" | head -10
```

- [ ] **Step 3: Manual test**

1. Go to Settings > Members as an admin
2. Tap "Add Child Account"
3. Sheet opens — enter a name and 4-digit PIN
4. Tap "Create account" — step B shows, PIN displayed in large digits
5. Tap "Copy PIN" — clipboard contains the PIN digits
6. Tap "Done" — sheet closes, member list refreshes showing the child

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/settings/AddChildSheet.tsx
git commit -m "feat(ui): implement AddChildSheet with 2-step form and PIN reveal"
```

---

### Task 4: `GET/POST /api/auth/child-login` routes

**Files:**
- Create: `apps/web/src/app/api/auth/child-login/route.ts`

Note: This route uses better-auth internal APIs to create a session. `auth.$context` returns the internal context. `internalAdapter.createSession(userId)` returns `{ token }`. `serializeSignedCookie` from `better-call` signs the cookie. These are the same APIs used in V1.

- [ ] **Step 1: Create the route**

```typescript
// apps/web/src/app/api/auth/child-login/route.ts
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { households, householdMembers, users } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { verifyPassword } from 'better-auth/crypto'
import { serializeSignedCookie } from 'better-call'

// Simple in-memory rate limiter: 5 attempts per IP per 15 minutes
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSec: 0 }
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true, retryAfterSec: 0 }
}

function resetRateLimit(ip: string) {
  attempts.delete(ip)
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

// ---- GET: list children in a household (public, no auth) --------------------

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const householdCode = searchParams.get('householdCode')?.toUpperCase()

  if (!householdCode) {
    return Response.json({ error: 'householdCode is required' }, { status: 400 })
  }

  const [household] = await db
    .select({ id: households.id })
    .from(households)
    .where(and(eq(households.code, householdCode), isNull(households.deleted_at)))
    .limit(1)

  if (!household) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const childMembers = await db
    .select({
      id: users.id,
      name: users.name,
      avatarColor: users.avatarColor,
    })
    .from(householdMembers)
    .innerJoin(users, eq(users.id, householdMembers.userId))
    .where(
      and(
        eq(householdMembers.householdId, household.id),
        eq(householdMembers.role, 'child'),
        isNull(householdMembers.deletedAt),
      )
    )

  return Response.json({ children: childMembers })
}

// ---- POST: authenticate a child with childId + PIN --------------------------

export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request)
  const { allowed, retryAfterSec } = checkRateLimit(ip)
  if (!allowed) {
    return Response.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    )
  }

  let body: { householdCode?: string; childId?: string; pin?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { householdCode, childId, pin } = body

  if (!householdCode || !childId || !pin) {
    return Response.json({ error: 'householdCode, childId, and PIN are required' }, { status: 400 })
  }

  const [household] = await db
    .select({ id: households.id })
    .from(households)
    .where(and(eq(households.code, householdCode.toUpperCase()), isNull(households.deleted_at)))
    .limit(1)

  if (!household) {
    return Response.json({ error: 'Invalid household code' }, { status: 401 })
  }

  const [member] = await db
    .select({ pin: householdMembers.pin, role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, household.id),
        eq(householdMembers.userId, childId),
        eq(householdMembers.role, 'child'),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!member) {
    return Response.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  if (!member.pin) {
    return Response.json(
      { error: 'No PIN set. Ask a parent to set one in Settings.' },
      { status: 401 }
    )
  }

  const valid = await verifyPassword({ hash: member.pin, password: pin })
  if (!valid) {
    return Response.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  resetRateLimit(ip)

  const ctx = await auth.$context
  const session = await ctx.internalAdapter.createSession(childId)

  const cookieName = ctx.authCookies.sessionToken.name
  const cookieOptions = ctx.authCookies.sessionToken.attributes

  const setCookie = await serializeSignedCookie(
    cookieName,
    session.token,
    ctx.secret,
    {
      ...cookieOptions,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }
  )

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setCookie,
    },
  })
}
```

- [ ] **Step 2: Verify field names match the schema**

The route above uses these field names — confirmed against `apps/web/src/db/schema/`:
- `households.code` — TypeScript field name (maps to `invite_code` DB column)
- `households.deleted_at` — snake_case (this table uses snake_case, unlike `householdMembers`)
- `users.avatarColor` — camelCase (matches schema)
- `householdMembers.deletedAt` — camelCase (this table uses camelCase)

No changes needed if you copy the route exactly as written above.

- [ ] **Step 4: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "child-login" | head -10
```

If `serializeSignedCookie` type import fails, try:
```typescript
import { serializeSignedCookie } from 'better-call'
```

If `better-call` is not directly importable, use this alternative to create the cookie manually:
```typescript
// Alternative if serializeSignedCookie is not available:
const cookieValue = `${session.token}`
const setCookie = `${cookieName}=${cookieValue}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/auth/child-login/route.ts
git commit -m "feat(api): add GET/POST /api/auth/child-login routes"
```

---

### Task 5: Child-login page

**Files:**
- Create: `apps/web/src/app/(auth)/child-login/page.tsx`

This is a standalone page — no app shell, no nav. Background `#FFF5F5`. Three steps: household code input, child name picker, PIN pad.

- [ ] **Step 1: Create the page**

```typescript
// apps/web/src/app/(auth)/child-login/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Delete, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import MemberAvatar from '@/components/shared/MemberAvatar'
import RoostLogo from '@/components/shared/RoostLogo'

const HOUSE_CODE_COOKIE = 'roost_house_code'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookieValue(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
}

interface ChildUser {
  id: string
  name: string
  avatarColor: string | null
}

const PIN_ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
]

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  backgroundColor: '#FFF5F5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
}

const panelStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 360,
  backgroundColor: '#B91C1C',
  borderRadius: 24,
  padding: '28px 24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}

const headingStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: '#ffffff',
  textAlign: 'center',
  marginBottom: 6,
}

const subStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.7)',
  textAlign: 'center',
}

const codeInputStyle: React.CSSProperties = {
  width: '100%',
  height: 64,
  border: '2px solid rgba(255,255,255,0.3)',
  borderBottom: '4px solid rgba(255,255,255,0.5)',
  borderRadius: 14,
  backgroundColor: 'rgba(255,255,255,0.15)',
  color: '#ffffff',
  fontSize: 22,
  fontWeight: 900,
  letterSpacing: 6,
  textAlign: 'center',
  outline: 'none',
  marginBottom: 4,
}

const slabButtonStyle: React.CSSProperties = {
  width: '100%',
  height: 56,
  backgroundColor: '#ffffff',
  color: '#B91C1C',
  fontWeight: 800,
  fontSize: 16,
  borderRadius: 16,
  border: 'none',
  borderBottom: '4px solid #C0160C',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export default function ChildLoginPage() {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [householdCode, setHouseholdCode] = useState('')
  const [children, setChildren] = useState<ChildUser[]>([])
  const [selectedChild, setSelectedChild] = useState<ChildUser | null>(null)
  const [pin, setPin] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [pinError, setPinError] = useState('')

  const fetchChildren = useCallback(async (code: string, isFromCookie = false) => {
    setCodeLoading(true)
    try {
      const r = await fetch(`/api/auth/child-login?householdCode=${encodeURIComponent(code)}`)
      if (!r.ok) {
        if (isFromCookie) {
          deleteCookie(HOUSE_CODE_COOKIE)
          setHouseholdCode('')
          setStep(1)
        } else {
          toast.error('House code not found.', { description: 'Check the code and try again.' })
        }
        return
      }
      const data = await r.json()
      const kids: ChildUser[] = data.children ?? []
      setChildren(kids)
      setCookieValue(HOUSE_CODE_COOKIE, code, 365)

      if (kids.length === 0) {
        toast.error('No child accounts in this household.', {
          description: 'Ask a parent to add a child account in Settings.',
        })
        return
      }
      if (kids.length === 1) {
        setSelectedChild(kids[0])
        setStep(3)
      } else {
        setStep(2)
      }
    } catch {
      toast.error('Something went wrong.', { description: 'Check your connection and try again.' })
    } finally {
      setCodeLoading(false)
    }
  }, [])

  // On mount: check for saved house code cookie and auto-advance
  useEffect(() => {
    const saved = getCookie(HOUSE_CODE_COOKIE)
    if (saved) {
      setHouseholdCode(saved)
      void fetchChildren(saved, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCodeSubmit() {
    const code = householdCode.trim().toUpperCase()
    if (code.length !== 6) return
    fetchChildren(code, false)
  }

  function handlePickChild(child: ChildUser) {
    setSelectedChild(child)
    setPin('')
    setPinError('')
    setStep(3)
  }

  function handleWrongHouse() {
    deleteCookie(HOUSE_CODE_COOKIE)
    setHouseholdCode('')
    setChildren([])
    setSelectedChild(null)
    setPin('')
    setStep(1)
  }

  function handlePinPress(key: string) {
    if (key === 'del') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (pin.length >= 4) return
    setPinError('')
    const next = pin + key
    setPin(next)
    if (next.length === 4) {
      void submitPin(next)
    }
  }

  async function submitPin(enteredPin: string) {
    if (!selectedChild) return
    setLoginLoading(true)
    try {
      const r = await fetch('/api/auth/child-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdCode, childId: selectedChild.id, pin: enteredPin }),
      })
      if (!r.ok) {
        setShake(true)
        setTimeout(() => setShake(false), 500)
        setPin('')
        setPinError('Wrong PIN. Try again.')
        return
      }
      router.push('/today')
    } catch {
      toast.error('Something went wrong.', { description: 'Check your connection and try again.' })
      setPin('')
    } finally {
      setLoginLoading(false)
    }
  }

  // ---- Step 1: House code ---------------------------------------------------

  if (step === 1) {
    return (
      <div style={pageStyle}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          style={{ width: '100%', maxWidth: 360 }}
        >
          <div style={panelStyle}>
            <div style={{ marginBottom: 16 }}>
              <RoostLogo variant="light" size="md" wordmark={false} />
            </div>
            <h1 style={headingStyle}>Hey! Enter your code.</h1>
            <p style={{ ...subStyle, marginBottom: 28 }}>Your household code and your secret PIN.</p>

            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={6}
              value={householdCode}
              onChange={(e) => setHouseholdCode(e.target.value.toUpperCase())}
              onKeyDown={(e) =>
                e.key === 'Enter' && householdCode.trim().length === 6 && handleCodeSubmit()
              }
              placeholder="XXXXXX"
              style={codeInputStyle}
            />

            <motion.button
              type="button"
              whileTap={{ y: 2 }}
              onClick={handleCodeSubmit}
              disabled={householdCode.trim().length !== 6 || codeLoading}
              style={{ ...slabButtonStyle, opacity: householdCode.trim().length !== 6 ? 0.5 : 1, marginTop: 12 }}
            >
              {codeLoading ? <Loader2 size={18} className="animate-spin" /> : 'Let me in'}
            </motion.button>

            <a
              href="/login"
              style={{
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.8)',
                marginTop: 14,
                textDecoration: 'none',
                display: 'block',
              }}
            >
              Back to grown-up sign in
            </a>
          </div>
        </motion.div>
      </div>
    )
  }

  // ---- Step 2: Pick child ---------------------------------------------------

  if (step === 2) {
    return (
      <div style={pageStyle}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          style={{ width: '100%', maxWidth: 360 }}
        >
          <div style={panelStyle}>
            <h1 style={{ ...headingStyle, marginBottom: 20 }}>Who are you?</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handlePickChild(child)}
                  style={{
                    width: '100%',
                    height: 64,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                    borderRadius: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '0 20px',
                  }}
                >
                  <MemberAvatar name={child.name} avatarColor={child.avatarColor} size="md" />
                  <span style={{ fontSize: 17, fontWeight: 800, color: '#ffffff' }}>
                    {child.name}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleWrongHouse}
              style={{
                marginTop: 16,
                background: 'none',
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
              }}
            >
              Wrong house?
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ---- Step 3: PIN pad -----------------------------------------------------

  return (
    <div style={pageStyle}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={{ width: '100%', maxWidth: 360 }}
      >
        <div style={panelStyle}>
          {selectedChild && (
            <div style={{ marginBottom: 12 }}>
              <MemberAvatar name={selectedChild.name} avatarColor={selectedChild.avatarColor} size="lg" />
            </div>
          )}
          <h1 style={{ ...headingStyle, marginBottom: 4 }}>
            {selectedChild?.name ?? 'Enter your PIN'}
          </h1>
          <p style={{ ...subStyle, marginBottom: 20 }}>Enter your secret PIN</p>

          {/* PIN dots */}
          <motion.div
            animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : {}}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', gap: 12, marginBottom: 8 }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  backgroundColor: i < pin.length ? '#ffffff' : 'rgba(255,255,255,0.3)',
                  transition: 'background-color 0.1s',
                }}
              />
            ))}
          </motion.div>

          {pinError && (
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 12, textAlign: 'center' }}>
              {pinError}
            </p>
          )}

          {loginLoading && (
            <Loader2 size={22} className="animate-spin" style={{ color: '#ffffff', marginBottom: 12 }} />
          )}

          {/* PIN pad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%', marginTop: 8 }}>
            {PIN_ROWS.map((row) =>
              row.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePinPress(key)}
                  style={{
                    height: 60,
                    backgroundColor: '#ffffff',
                    border: '1.5px solid rgba(255,255,255,0.4)',
                    borderBottom: '3px solid rgba(0,0,0,0.15)',
                    borderRadius: 12,
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#B91C1C',
                    cursor: 'pointer',
                  }}
                >
                  {key}
                </button>
              ))
            )}
            {/* Bottom row: blank, 0, backspace */}
            <div />
            <button
              type="button"
              onClick={() => handlePinPress('0')}
              style={{
                height: 60,
                backgroundColor: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.4)',
                borderBottom: '3px solid rgba(0,0,0,0.15)',
                borderRadius: 12,
                fontSize: 22,
                fontWeight: 800,
                color: '#B91C1C',
                cursor: 'pointer',
              }}
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handlePinPress('del')}
              style={{
                height: 60,
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Delete size={20} style={{ color: '#ffffff' }} />
            </button>
          </div>

          {children.length > 1 && (
            <button
              type="button"
              onClick={() => { setPin(''); setPinError(''); setStep(2) }}
              style={{ marginTop: 16, background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}
            >
              Not me
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Check the (auth) layout doesn't add app shell to child-login**

```bash
grep -n "child-login\|ChildLogin" apps/web/src/app/\(auth\)/layout.tsx 2>/dev/null || echo "no auth layout"
```

If there's no `(auth)` layout, the page renders standalone. If there is one, ensure it doesn't inject the app nav.

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "child-login" | head -10
```

- [ ] **Step 4: Manual test**

1. Navigate to `http://localhost:3000/child-login`
2. Enter a valid 6-char household code — should advance to name picker (or PIN pad if 1 child)
3. Enter wrong household code — toast error "House code not found"
4. Enter valid code and wrong PIN — dots shake, "Wrong PIN. Try again." appears
5. Enter valid code and correct PIN — redirects to `/today` as the child user
6. Reload `/child-login` — code is pre-filled from cookie, auto-advances to picker

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(auth\)/child-login/page.tsx
git commit -m "feat(auth): add child-login page with household code and PIN pad flow"
```

---

### Task 6: Settings — child account discoverability callout

**Files:**
- Modify: `apps/web/src/app/(app)/settings/page.tsx`

Add a callout card for admins who have no children yet, above the member list in the Members section.

- [ ] **Step 1: Find the Members section in settings/page.tsx**

```bash
grep -n "section-members\|Add Child\|addChildOpen\|isAdmin.*members" apps/web/src/app/\(app\)/settings/page.tsx | head -20
```

Note the line where `isAdmin && members.some(m => m.role === 'child')` currently triggers the rewards callout. The new callout goes just above the member list `<SlabCard>`.

- [ ] **Step 2: Add the Baby import**

Find the existing Lucide imports in settings/page.tsx and add `Baby` if not already there:
```typescript
import { ..., Baby } from 'lucide-react'
```

- [ ] **Step 3: Insert the callout**

Find the section that renders the member list (just before the `<SlabCard>` that maps members). Insert this block for admins with no children:

```tsx
{isAdmin && !members.some((m) => m.role === 'child') && (
  <div
    className="mb-3 rounded-xl p-4"
    style={{
      backgroundColor: '#EFF6FF',
      border: '1.5px solid #BFDBFE',
    }}
  >
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: '#DBEAFE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Baby size={18} style={{ color: '#1D4ED8' }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#1E3A5F', marginBottom: 2 }}>
          Add a child account
        </p>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#3B6BA0', lineHeight: 1.4, marginBottom: 10 }}>
          Kids get a 4-digit PIN login. No email needed, no access to finances, ever.
        </p>
        <button
          type="button"
          onClick={() => setAddChildOpen(true)}
          style={{
            height: 34,
            paddingLeft: 14,
            paddingRight: 14,
            backgroundColor: '#3B82F6',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 12,
            borderRadius: 8,
            border: 'none',
            borderBottom: '2px solid #1A5CB5',
            cursor: 'pointer',
          }}
        >
          Add child account
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript and manual test**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "settings" | head -10
```

Open Settings > Members as an admin with no children. Confirm the blue callout card appears. After adding a child, confirm it disappears.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(app\)/settings/page.tsx
git commit -m "feat(settings): add child account discoverability callout for admins"
```

---

### Task 7: `DELETE /api/household/members/[id]` route

**Files:**
- Create: `apps/web/src/app/api/household/members/[id]/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// apps/web/src/app/api/household/members/[id]/route.ts
import { requireSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params // householdMembers.id

  const session = await requireSession()

  const membership = await getUserHousehold(session.user.id)
  if (!membership) {
    return Response.json({ error: 'No household found' }, { status: 404 })
  }
  if (membership.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [target] = await db
    .select({ id: householdMembers.id, role: householdMembers.role, userId: householdMembers.userId })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.id, id),
        eq(householdMembers.householdId, membership.householdId),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!target) {
    return Response.json({ error: 'Member not found' }, { status: 404 })
  }
  if (target.role === 'admin') {
    return Response.json({ error: 'Transfer admin before removing yourself' }, { status: 400 })
  }
  if (target.userId === session.user.id) {
    return Response.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  // Soft delete
  await db
    .update(householdMembers)
    .set({ deletedAt: new Date() })
    .where(eq(householdMembers.id, id))

  return Response.json({ success: true })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "members/\[id\]" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/api/household/members/[id]/route.ts"
git commit -m "feat(api): add DELETE /api/household/members/[id] route"
```

---

### Task 8: `PATCH /api/household/members/[id]/pin` route

**Files:**
- Create: `apps/web/src/app/api/household/members/[id]/pin/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// apps/web/src/app/api/household/members/[id]/pin/route.ts
import { requireSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params

  const session = await requireSession()

  const membership = await getUserHousehold(session.user.id)
  if (!membership) {
    return Response.json({ error: 'No household found' }, { status: 404 })
  }
  if (membership.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { pin?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.pin || !/^\d{4}$/.test(body.pin)) {
    return Response.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
  }

  const [target] = await db
    .select({ id: householdMembers.id, role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.id, id),
        eq(householdMembers.householdId, membership.householdId),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!target) {
    return Response.json({ error: 'Member not found' }, { status: 404 })
  }
  if (target.role !== 'child') {
    return Response.json({ error: 'PIN can only be set for child accounts' }, { status: 400 })
  }

  const hashedPin = await hashPassword(body.pin)

  await db
    .update(householdMembers)
    .set({ pin: hashedPin })
    .where(eq(householdMembers.id, id))

  return Response.json({ success: true })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "pin" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/api/household/members/[id]/pin/route.ts"
git commit -m "feat(api): add PATCH /api/household/members/[id]/pin route"
```

---

### Task 9: `MemberSheet` — real implementation

**Files:**
- Modify: `apps/web/src/components/settings/MemberSheet.tsx`

Replace the placeholder with a minimal but functional sheet: name, role badge, PIN reset for children, remove member.

- [ ] **Step 1: Implement MemberSheet**

```typescript
// apps/web/src/components/settings/MemberSheet.tsx
'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, Shield, User, Baby, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import MemberAvatar from '@/components/shared/MemberAvatar'
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

export interface SheetMember {
  id: string
  userId: string
  name: string
  email: string | null
  role: string
  avatarColor: string | null
  joinedAt: string | null
  expiresAt?: string | null
}

interface MemberSheetProps {
  member: SheetMember | null
  householdId: string
  onClose: () => void
  onRefetch: () => void
}

export default function MemberSheet({ member, householdId, onClose, onRefetch }: MemberSheetProps) {
  const queryClient = useQueryClient()
  const [newPin, setNewPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [savingPin, setSavingPin] = useState(false)
  const [removing, setRemoving] = useState(false)

  if (!member) return null

  const isChild = member.role === 'child'

  async function handleSavePin() {
    if (!/^\d{4}$/.test(newPin)) return
    setSavingPin(true)
    try {
      const r = await fetch(`/api/household/members/${member!.id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { error?: string }
        toast.error(body.error ?? 'Failed to update PIN', { description: 'Try again.' })
        return
      }
      toast.success('PIN updated', { description: `${member!.name}'s PIN has been changed.` })
      setNewPin('')
    } catch {
      toast.error('Something went wrong.', { description: 'Check your connection.' })
    } finally {
      setSavingPin(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      const r = await fetch(`/api/household/members/${member!.id}`, { method: 'DELETE' })
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { error?: string }
        toast.error(body.error ?? 'Failed to remove member', { description: 'Try again.' })
        return
      }
      queryClient.invalidateQueries({ queryKey: ['household-members'] })
      onRefetch()
      onClose()
      toast.success(`${member!.name} removed from household.`)
    } catch {
      toast.error('Something went wrong.', { description: 'Check your connection.' })
    } finally {
      setRemoving(false)
    }
  }

  const roleIcon = isChild ? Baby : member.role === 'admin' ? Shield : User
  const RoleIcon = roleIcon

  return (
    <DraggableSheet open={!!member} onOpenChange={(v: boolean) => { if (!v) onClose() }}>
      <div className="px-4 pb-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <MemberAvatar name={member.name} avatarColor={member.avatarColor} size="lg" />
          <div>
            <p className="text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
              {member.name}
            </p>
            <span
              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs"
              style={{
                backgroundColor: isChild ? '#EFF6FF' : member.role === 'admin' ? '#FEE2E2' : 'var(--roost-border)',
                color: isChild ? '#1D4ED8' : member.role === 'admin' ? '#B91C1C' : 'var(--roost-text-secondary)',
                fontWeight: 700,
              }}
            >
              <RoleIcon size={11} />
              {isChild ? 'Child account' : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
            </span>
          </div>
        </div>

        {/* Child: PIN reset */}
        {isChild && (
          <div className="mb-6">
            <p
              className="mb-2 text-xs uppercase tracking-wider"
              style={{ color: '#374151', fontWeight: 700, letterSpacing: '0.07em' }}
            >
              Reset PIN
            </p>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                placeholder="New 4-digit PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={{
                  width: '100%',
                  height: 48,
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  borderRadius: 12,
                  backgroundColor: 'var(--roost-surface)',
                  color: 'var(--roost-text-primary)',
                  fontSize: 22,
                  fontWeight: 900,
                  padding: '0 48px 0 14px',
                  outline: 'none',
                  letterSpacing: '0.25em',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--roost-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSavePin}
              disabled={!/^\d{4}$/.test(newPin) || savingPin}
              style={{
                width: '100%',
                height: 44,
                backgroundColor: /^\d{4}$/.test(newPin) ? '#3B82F6' : 'var(--roost-border)',
                color: /^\d{4}$/.test(newPin) ? 'white' : 'var(--roost-text-muted)',
                fontWeight: 700,
                fontSize: 14,
                borderRadius: 10,
                border: 'none',
                borderBottom: `2px solid ${/^\d{4}$/.test(newPin) ? '#1A5CB5' : 'var(--roost-border-bottom)'}`,
                cursor: /^\d{4}$/.test(newPin) ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {savingPin ? <Loader2 size={15} className="animate-spin" /> : 'Save new PIN'}
            </button>
          </div>
        )}

        {/* Remove member */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              style={{
                width: '100%',
                height: 44,
                backgroundColor: 'transparent',
                color: '#EF4444',
                fontWeight: 700,
                fontSize: 14,
                borderRadius: 10,
                border: '1.5px solid #FECACA',
                cursor: 'pointer',
              }}
            >
              Remove {member.name} from household
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                {member.name} will lose access to this household immediately. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                disabled={removing}
                style={{ backgroundColor: '#EF4444' }}
              >
                {removing ? 'Removing...' : 'Remove'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DraggableSheet>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "MemberSheet" | head -10
```

- [ ] **Step 3: Manual test**

1. Go to Settings > Members as admin
2. Tap a child member — sheet opens showing child's name, "Child account" badge, PIN reset field
3. Enter a new 4-digit PIN and tap "Save new PIN" — success toast
4. Tap a regular member — sheet opens with name, "Member" badge, remove button
5. Tap "Remove X from household" — AlertDialog appears
6. Confirm — member disappears from list, success toast

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/settings/MemberSheet.tsx
git commit -m "feat(ui): implement MemberSheet with PIN reset and remove member"
```

---

### Task 10: Production cleanup

**Files:**
- Delete: `apps/web/src/app/(app)/food/` (entire directory)
- Create: `apps/web/src/app/privacy/page.tsx`
- Create: `apps/web/src/app/terms/page.tsx`

- [ ] **Step 1: Verify /food is not linked anywhere**

```bash
grep -rn '"/food"\|href.*food\|link.*food' apps/web/src/ 2>/dev/null | grep -v "node_modules"
```

Expected: no results. If any links exist, remove them before deleting the directory.

- [ ] **Step 2: Delete the /food route**

```bash
rm -rf apps/web/src/app/\(app\)/food
```

- [ ] **Step 3: Create /privacy placeholder**

```typescript
// apps/web/src/app/privacy/page.tsx
import Link from 'next/link'
import RoostLogo from '@/components/shared/RoostLogo'

export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <RoostLogo variant="dark" size="md" />
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: '#111827',
          marginBottom: 12,
        }}
      >
        Privacy Policy
      </h1>
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#6B7280',
          marginBottom: 32,
          maxWidth: 400,
          lineHeight: 1.5,
        }}
      >
        This page is coming soon. We take your privacy seriously and are working on a full policy.
      </p>
      <Link
        href="/"
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#EF4444',
          textDecoration: 'none',
        }}
      >
        Back to home
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Create /terms placeholder**

```typescript
// apps/web/src/app/terms/page.tsx
import Link from 'next/link'
import RoostLogo from '@/components/shared/RoostLogo'

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <RoostLogo variant="dark" size="md" />
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: '#111827',
          marginBottom: 12,
        }}
      >
        Terms of Service
      </h1>
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#6B7280',
          marginBottom: 32,
          maxWidth: 400,
          lineHeight: 1.5,
        }}
      >
        This page is coming soon. Our full terms of service will be available before launch.
      </p>
      <Link
        href="/"
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#EF4444',
          textDecoration: 'none',
        }}
      >
        Back to home
      </Link>
    </div>
  )
}
```

- [ ] **Step 5: Verify build is clean**

```bash
cd apps/web && npm run build 2>&1 | tail -20
```

Expected: clean build, no errors. Verify `/food` no longer appears in the routes output.

- [ ] **Step 6: Verify /privacy and /terms render**

Navigate to `http://localhost:3000/privacy` and `http://localhost:3000/terms` — both should show the placeholder page with the Roost logo, heading, body text, and "Back to home" link. No 404s.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/privacy/page.tsx apps/web/src/app/terms/page.tsx
git commit -m "feat: add /privacy and /terms placeholder pages, remove dead /food route"
```
