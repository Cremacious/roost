# Child Account to Standard Account Upgrade

Date: 2026-05-20
Status: Approved (design)

## Problem

Roost has no path to turn a child account into a standard account. Once a child
grows up and should become a normal household member, there is no obvious,
discoverable way for a parent/admin to make that change, and no way for the child
to gain real email/password login (today they are PIN-only with a placeholder
email and finance access permanently blocked).

## Goals

- Parents/admins can discover and start the upgrade easily.
- The child completes the upgrade securely by setting their own email + password.
- The transition preserves the child's history (chores, points, streaks) because
  it converts the same account in place.
- Messaging is clear and reassuring for both the parent and the child.

## Non-goals (out of scope)

- Converting a child into an independent account that leaves the household.
- Bulk upgrades of multiple children at once.
- Reverting a standard member back into a child account.
- Requiring an email verification round-trip (the admin vouches and the child is
  in an authenticated session, so the new email is auto-verified).

## Background: how a child account works today

A child account is:

- A better-auth `user` row with a placeholder email `child_{id}@roost.internal`,
  `emailVerified=true`, and NO credential `account` row (no password).
- An app `users` row with `isChildAccount=true`, `childOfHouseholdId=<household>`.
- A `household_members` row with `role='child'` and a hashed `pin`.
- A `member_permissions` row with finance off and most add/edit permissions off.

Login is via household code + 4-digit PIN, not email/password.

"Standard account" therefore means: real unique email, a credential `account`
row with a hashed password, `role='member'`, `isChildAccount=false`, no PIN, and
permissions reset to standard member defaults (finance unlocked).

## Chosen approach

A gated, two-party handshake:

1. Admin enables the upgrade from the child's member sheet.
2. Child completes it from their own session by setting email + password.

This respects Roost's rule that users set their own passwords (nobody sets a
password on someone else's behalf), keeps the parent as gatekeeper, and converts
the same account so all history is retained.

## Flow

1. Admin opens the Household page, opens the child's member sheet, and taps
   "Allow [name] to upgrade to a full account." This sets
   `household_members.upgrade_allowed = true`. The admin can toggle it back off
   any time before the child finishes.
2. The child, signed in via their PIN session, sees an "Upgrade to a full
   account" call to action (banner on the dashboard plus an entry in their
   settings). It only appears when `upgrade_allowed = true`.
3. The child enters an email and password (with confirm), reads the reassurance
   copy, and submits.
4. The server converts the account atomically and the child is now a standard
   member. Their current session stays valid; next sign-in uses email/password.

## Data model

- Add one column: `household_members.upgrade_allowed` boolean, not null, default
  false. Set true on admin enable; false on revoke and after a successful
  conversion. Run `npm run db:push` after the schema change.
- No new tables. Conversion mutates existing rows.

## Conversion endpoint

`POST /api/household/members/[id]/upgrade`

Authorization: callable only by the child themselves. The caller's session user
must match the target membership's user, the target must have
`isChildAccount=true`, and the membership must have `upgrade_allowed=true`.
(Admins do not call this endpoint; they only flip the flag.)

Request body: `{ email, password }`.

Validation:

- Email is well-formed and not already used by any `user.email` (unique).
- Password meets the existing signup strength rules.

Operations (wrapped so a failure does not half-convert):

1. Update `user.email` and `users.email` to the new email; set
   `user.emailVerified = true`.
2. Insert a credential row into `account`: `providerId='credential'`,
   `accountId = userId`, `password = hashPassword(password)`.
3. Set `users.isChildAccount = false`, clear `users.childOfHouseholdId`.
4. Update `household_members`: `role='member'`, `pin=null`,
   `upgrade_allowed=false`.
5. Reset `member_permissions` for this user to standard member defaults
   (finance view/add on; the schema column defaults).

The same user id is kept throughout, so chore completions, points, streaks, and
all other history remain attached.

## Admin enable endpoint

The admin action sets the flag. It can reuse a small PATCH on the member route
(for example `PATCH /api/household/members/[id]` accepting
`{ upgradeAllowed: boolean }`, admin only) or a dedicated route. Admin only,
household-scoped, target must be a child in the admin's household.

## UI

- Admin: in `MemberSheet`, for child members, add an "Allow [name] to upgrade to
  a full account" toggle/row with the reassurance copy below. When already
  allowed, show an "Upgrade enabled, waiting for [name] to finish" state with a
  way to turn it off.
- Child: a dashboard banner (similar pattern to the reminder banner) and a
  settings entry, both gated on `upgrade_allowed`. Tapping opens a sheet with an
  email field, password + confirm fields, reassurance copy, and a submit button.
- Follow existing Roost design rules (slab cards, section colors, sheet patterns,
  no emojis, no em dashes).

## Edge cases

- Free-tier member limit (5 members): converting moves the account from the
  child bucket into the member bucket. If the household already has 5 members,
  block completion with a clear message ("Your household is full. Upgrade to
  premium or remove a member to free a spot."), and warn the admin at enable time
  if there is no room. The freed child slot becomes available again.
- Email already in use: inline error; the child picks another.
- Revoke: if the admin turns the flag off before completion, the child's submit
  fails the `upgrade_allowed` check with a clear message.
- Session: the child's current session stays valid (same user id). No forced
  re-login. They use email/password on next sign-in.
- This is a free feature, not premium-gated.

## Messaging

- Admin sheet, before enabling: "This lets [name] set their own email and
  password and become a full member. They keep all their chores, points, and
  history. As a member they will also be able to see household expenses."
- Child call to action: "Ready for your own account? Set an email and password to
  become a full member. You keep everything you have already done."
- Child success: "You are all set. From now on, sign in with your email and
  password instead of a PIN."

## Testing

- Seed script (`src/db/seed.ts`, run via `npm run db:seed`) provides a Test Child
  account (PIN 1234) in the free household plus admin accounts, so the flow can be
  exercised end to end: admin enables upgrade, child signs in by PIN, completes
  the upgrade, then signs in with the new email/password as a member.
- Verify history (chore completions/points) survives the conversion.
- Verify the member-limit block, email-collision error, and revoke path.
