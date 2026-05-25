# Platform Capability Audit (Web vs Mobile App)

Last updated: 2026-05-20

## Purpose

Roost ships on web first, then iOS/Android via Expo. Some controls currently
imply a platform capability that is not actually available on the platform the
user is on. The clearest example: a "Remind" button appears on web even though
push notifications are not implemented on web. This document records the audit
findings, the product decisions, and the implementation checklist so platform
differences feel intentional rather than accidental.

## Core finding: push notifications are not wired up on web

Three confirmations in the codebase:

- `src/app/api/expenses/settle-all/remind/route.ts` writes only
  `settlementLastRemindedAt` (a rate-limit timestamp). It sends nothing. The
  recipient sees nothing on web.
- `src/app/api/cron/settlement-reminders/route.ts` contains an explicit comment:
  "send push notification to creditor when Expo app is ready / For now just log,
  web has no push capability."
- `src/app/api/calendar/route.ts` (notify path) reads `users.pushToken`, filters
  out empty tokens, and returns early when there are none. The web app never
  registers a push token, so this is always a silent no-op on web.

The `users.push_token` column exists for the future Expo app. Until that app
ships, any push-only control should be hidden on web.

## What already works on web (not a mismatch)

- Reminders. `src/app/api/cron/reminders/route.ts` creates `reminder_receipts`
  rows, and `ReminderBanner` polls `/api/reminders/due`. So reminder notify types
  (Just me, Everyone, Specific people) genuinely surface via the in-app banner on
  web. No change needed.
- Two-sided settlement claim. When a debtor taps "I paid", the creditor sees a
  pending confirmation card in-app. The claim itself is web-functional. Only the
  optional "Remind" nudge is push-only.
- Settings Notifications section (`settings/page.tsx`) already shows "Coming soon"
  pills with disabled toggles and the subtitle "Push notifications work in the
  Roost mobile app." This is the canonical pattern to reuse.

## Device features that degrade acceptably on web today

- Receipt camera: `ReceiptScanner.tsx` uses `<input capture="environment">`.
  Desktop browsers ignore `capture` and show a file picker; mobile web opens the
  camera. The future Expo build needs a native camera path.
- Geolocation for weather: `TopBar.tsx` and `settings/page.tsx` use
  `navigator.geolocation`. Works on web. Expo needs native location permission.
- Clipboard copy (house code, PIN, promo): works on web over HTTPS. No
  `navigator.share` is used anywhere yet, so invites are copy-only with no native
  share sheet.

## Product decision list

| # | Surface | Location | Mismatch | Decision |
|---|---------|----------|----------|----------|
| 1 | Settlement "Remind" button | money DashboardTab DebtCard, `SettleSheet` i_claimed mode | High: looks active, no-op on web | Hide on web. Keep the rate-limit plumbing for the mobile app. |
| 2 | Calendar "Notify attendees" | `EventSheet` | Medium: push path no-ops on web | Gate until push ships (hide on web). Keep `calendar/route.ts` push code as the mobile path. |
| 3 | Settings Notifications section | `settings/page.tsx` | None: already correct | Keep as the canonical pattern. |
| 4 | Reminder notify types | `ReminderSheet` | None: works on web via banner | No change. |
| 5 | Receipt camera capture | `ReceiptScanner.tsx` | Low: degrades fine | Keep for web. Flag for Expo native camera. |
| 6 | Weather geolocation | `TopBar.tsx`, `settings/page.tsx` | Low | Keep for web. Flag for Expo native location. |
| 7 | Invite/code sharing | `InviteMemberSheet`, `InviteGuestSheet`, `AddChildSheet`, `household/page.tsx` | Low: no native share | Add `navigator.share` with clipboard fallback. |
| 8 | Ambient tablet mode | Roadmap (not built) | n/a | Keep out of nav until built. |

Decisions confirmed by product: items 1 and 2 hide on web (no disabled-with-label
treatment); calendar notify is gated until push ships rather than rebuilt on the
in-app receipt system.

## Implementation checklist

Foundation:

- [x] Add `usePlatformCapabilities()` hook exposing `canPush` (false on web
      today), `hasNativeShare`, `isMobileWeb`. Single source of truth so controls
      gate consistently. (`src/lib/hooks/usePlatformCapabilities.ts`)

Item 1, settlement Remind:

- [x] Hide the "Remind" affordance in `money/page.tsx` DashboardTab DebtCard
      behind `canPush` (the `!iOwe` branch). Keep "Settle up" for the `iOwe`
      branch.
- [x] Hide the "Remind" button in `SettleSheet` i_claimed mode behind `canPush`.
- [x] Reword the claim helper copy so it does not imply a push notification.
- [x] Leave `/api/expenses/settle-all/remind` and its rate limit intact.

Item 2, calendar notify:

- [x] Gate the notify control in `EventSheet` behind `canPush` (hide on web). The
      whole "Notify when saved" card is gated in `LeftColumn`, covering both the
      mobile and desktop render sites.
- [x] Leave `calendar/route.ts` push code as the mobile path.

Item 7, native share:

- [x] Add a shared `shareOrCopy({ title, text, url })` util: use `navigator.share`
      when available, fall back to `navigator.clipboard.writeText`. The util
      returns 'shared' | 'copied' | 'failed' so callers own their own toast.
      (`src/lib/utils/share.ts`)
- [x] Apply in `InviteMemberSheet` (Share/Copy code button).
- [x] Apply in `household/page.tsx` (mobile + desktop hero code buttons).
- [x] Apply in `settings/page.tsx` Household section invite-code button.
- [n/a] `InviteGuestSheet` is a "coming soon" stub with no code to share.
- [n/a] `AddChildSheet` intentionally stays copy-only. The PIN is a secret
        credential, the sheet does not have the household code, so a bare PIN in a
        generic share sheet is poor security UX and not actionable on its own.

Expo readiness (defer to mobile build, documented here):

- [ ] Receipt capture and geolocation need native Expo modules; web paths stay.

Cross-cutting:

- [x] Swept for other controls that call a push-only endpoint. The only push
      paths are settlement remind (gated), calendar notify (gated), and the
      recurring-expenses / settlement-reminders crons (server-side only, no UI
      button, log-only until push ships). Reminder notify types are in-app on web
      and stay as-is.
- [x] Added a "Platform behavior" note to CLAUDE.md so future features default to
      the correct gating.
