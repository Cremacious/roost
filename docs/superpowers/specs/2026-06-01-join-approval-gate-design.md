# Join Approval Gate — Design Spec

**Date:** 2026-06-01
**Status:** Approved

## Problem

Household join codes can be shared accidentally or discovered by the wrong person. Currently, anyone with the 6-character code or a guest invite link is added to the household immediately. This spec adds an admin-controlled approval gate that is on by default.

---

## Schema

### `households` table — new column

```
join_approval_required  boolean  not null  default true
```

Per-household switch. Defaults to `true` (approval required). Can be toggled off by the admin in Settings.

### New table: `join_requests`

```
id              uuid        primary key, default gen_random_uuid()
household_id    text        not null, FK → households.id
user_id         text        not null, FK → users.id
type            text        not null  -- 'code' | 'invite'
status          text        not null  default 'pending'
created_at      timestamp   not null  default now()
```

Rejected requests are **hard-deleted** — they are not kept in the table. This ensures the rejected user's waiting screen correctly detects the rejection (polls for `not_found`) and bounces them cleanly back to onboarding.

A unique constraint on `(household_id, user_id)` prevents duplicate pending requests.

---

## API

### Modified routes

**`POST /api/household/join`** and **`POST /api/invite/[token]`** both gain the same branch:

1. Look up `join_approval_required` on the household.
2. If `false` → existing behavior (create member row immediately).
3. If `true`:
   - Check for an existing `join_requests` row for this `(household_id, user_id)` — return 409 `ALREADY_REQUESTED` if found.
   - Insert a `join_requests` row with `type = 'code'` or `'invite'`.
   - Return `{ status: 'pending', householdName }` instead of `{ householdId }`.

**`PATCH /api/household/[id]`** — accepts new field `joinApprovalRequired: boolean` (admin only).

### New routes

**`GET /api/household/join-requests/status`**
- Auth: session only (no household membership required).
- Looks up the current user's most recent `join_requests` row across all households.
- Returns `{ status: 'pending', householdName }` | `{ status: 'approved', householdId }` | `{ status: 'not_found' }`.
- `not_found` means the request was rejected (hard-deleted by admin).
- `approved` means the user now has an active `household_members` row — client should refresh session and navigate to `/dashboard`.

**`GET /api/household/join-requests`**
- Auth: admin of their household.
- Returns pending requests for the admin's household with requester name, avatar color, and `created_at`.

**`POST /api/household/join-requests/[id]/approve`**
- Auth: admin only.
- Creates `household_members` row + default `member_permissions` for the requester.
- Hard-deletes the `join_requests` row.
- Logs `member_joined` activity.
- Returns 200 on success.

**`POST /api/household/join-requests/[id]/reject`**
- Auth: admin only.
- Hard-deletes the `join_requests` row.
- No notification sent to the requester (they poll and get `not_found`).
- Returns 200 on success.

---

## Onboarding UI — waiting room state

The existing 3-step onboarding flow gains a **step 3 "pending" variant** alongside the current "success" variant.

**Trigger:** when `POST /api/household/join` or `POST /api/invite/[token]` returns `{ status: 'pending' }`, the onboarding page advances to step 3 in pending mode.

**Waiting room display:**
- Icon: Lucide `Clock` (cyan, matches reminders section — a neutral waiting color)
- Heading: "Waiting for approval"
- Body: "Your request to join **[Household Name]** has been sent to the admin. Hang tight."
- Subtle "Checking..." indicator below

**Polling:**
- Calls `GET /api/household/join-requests/status` every 10 seconds.
- On `approved`: calls session refresh (`GET /api/auth/get-session?disableCookieCache=true`), then `router.push('/dashboard')`.
- On `not_found` (rejected): resets to step 1, shows toast — "Your request wasn't approved. You can try a different household."

**Routing:** No `proxy.ts` changes needed. The user stays on `/onboarding` which is already in the bypass list. They have no active household membership so the middleware naturally keeps them there.

---

## Admin UI

### Notification banner

A dismissible banner below the TopBar (same pattern as `ReminderBanner`) when the admin has pending join requests.

- Text: "N member request(s) waiting for your approval"
- Links to Settings > Members (scrolls to the pending section)
- Polls `GET /api/household/join-requests` every 60 seconds
- Dismissed per-session via `sessionStorage` key `roost-join-requests-banner-dismissed`
- Web only for now; push notifications deferred until the Expo mobile app is built

### Settings > Members — pending requests subsection

Appears above the active members list when `joinRequests.length > 0`.

- Section header: "Pending Requests (N)"
- Each row: avatar + name + "Requested X ago" + green slab `Check` button (approve) + red ghost `X` button (reject)
- Both actions are optimistic: row disappears immediately, banner count decrements
- No confirmation dialog on reject — the action is low-stakes (user returns to onboarding)

---

## Settings > Household — approval toggle

Admin-only toggle in the Household section, below the invite code row.

- Label: "Require approval for new members"
- Muted description: "Anyone with your household code or invite link must be approved before they can join."
- Default: on
- When toggled **off**: an inline amber warning appears — "Anyone with your code can join immediately. Only share it with people you trust."
- Calls `PATCH /api/household/[id]` with `{ joinApprovalRequired: false }`.

---

## Behavior matrix

| `join_approval_required` | Action | Result |
|---|---|---|
| `true` | Join by code | `join_requests` row created, user sees waiting room |
| `true` | Accept guest invite link | `join_requests` row created, user sees waiting room |
| `false` | Join by code | `household_members` row created immediately (existing behavior) |
| `false` | Accept guest invite link | `household_members` row created immediately (existing behavior) |
| `true` | Admin approves | `join_requests` deleted, `household_members` created |
| `true` | Admin rejects | `join_requests` hard-deleted, user bounced to onboarding step 1 |

---

## Out of scope

- Push notifications for admins (deferred to Expo mobile app build)
- Request expiry / auto-rejection after N days
- Bulk approve/reject
- Requester-initiated cancellation of a pending request
