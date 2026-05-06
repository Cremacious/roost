# Settings Page — Design Spec

**Date:** 2026-05-06
**Status:** Approved

---

## Overview

A single scrollable settings page at `/settings` accessible via a dedicated sidebar nav item (Settings, `Settings` Lucide icon) placed at the bottom of the nav list after Stats and Household. On mobile, Settings is reachable via the "More" sheet in the bottom nav.

The page uses a sticky left section nav on desktop (visible inside the page content area, not the app sidebar). On mobile the section nav is hidden; sections stack vertically with a collapsible anchor jump-list at the top.

No Appearance section — V2 uses a single default theme with no picker.

---

## Navigation

### Sidebar
- Settings added as a nav item after Stats and Household, before the user block
- Icon: Lucide `Settings`
- Route: `/settings`
- Visible to all authenticated users

### Mobile
- Accessible via the "More" sheet in the bottom nav (existing pattern, no change)

---

## Page Layout

**Desktop:** `max-w-4xl` centered via `PageContainer`. Two-column flex layout:
- Left: 160px sticky section nav with section labels and `admin` badges on admin-only items
- Right: `flex-1` scrollable content area

**Active section:** Determined by scroll position via `IntersectionObserver`. Active section label in the left nav is highlighted with brand red (#EF4444) background and white text.

**Mobile:** Left nav hidden. Sections stack vertically. Collapsible anchor jump-list at top. Same `PageContainer` width constraint.

**Admin-only sections** appear in the left nav with a small `admin` pill. Non-admin users do not see these nav items and the sections are not rendered.

---

## Sections

Sections appear in this order. All sections except Danger Zone have a corresponding left nav item.

### 1. Profile
Available to all users.

- **Avatar color picker:** 12 color swatches. Selected swatch shown on the initials avatar. Updates immediately on click, persists via `PATCH /api/user/profile`.
- **Display name:** Inline text input with a Save button. Saves on click.
- **Email:** Inline text input with a Save button. Server validates uniqueness before saving.
- **Timezone:** Dropdown of ~26 timezone options. Saves on change.
- **Password:** A "Change password" row that expands inline into a 3-field form (current password, new password, confirm new password) with a strength meter (weak / fair / good / strong). Save button submits to `POST /api/user/change-password`. Collapses on success.

All fields save individually. No global save button.

---

### 2. Preferences
Available to all users.

- **Temperature unit:** Toggle between °F and °C. Saves immediately via `PATCH /api/user/preferences`.
- **Weather location:** Row showing current coordinates ("28.5°N, 81.4°W") or "Not set". "Update" button triggers browser geolocation API, saves lat/lng via `PATCH /api/user/preferences`. Auto-detects Fahrenheit vs Celsius from the browser timezone (America/ prefix = °F) on first grant.
- **Language:** Dropdown. English is active. Spanish shows a "coming soon" toast and reverts the selection.

---

### 3. Notifications
Available to all users.

Informational section. No interactive toggles yet.

- Short explanatory paragraph: "Push notifications work in the Roost mobile app. Here's what you'll be able to configure when the app launches."
- Read-only list of upcoming notification types, each shown with a disabled toggle and "Coming soon" label:
  - Chore reminders
  - Expense activity
  - Calendar events
  - Reminders due
  - Household announcements

When Expo push ships, this section is upgraded to real toggles stored in `users.notification_preferences` (new column, to be added in that phase).

---

### 4. Household
Admin only. Non-admins see a read-only view of household name and invite code (copy only, no edit).

- **Household name:** Inline text input with Save button. `PATCH /api/household/[id]`.
- **Invite code:** Displayed in monospace with a copy-to-clipboard button. "Generate new code" button opens a confirmation dialog warning that existing shared links will stop working. On confirm: `POST /api/household/[id]/regenerate-code`.
- **Transfer admin:** Dropdown of non-child members. Confirm dialog before executing. `POST /api/household/[id]/transfer-admin`. After transfer, TanStack Query invalidates `["household"]` and `["members"]`; the page re-renders without admin-only sections since the current user is now a Member.

---

### 5. Members
Available to all users. Admin users see action controls; non-admins see read-only list.

**Member list:**
- Each row: `MemberAvatar` (initials, avatar color), display name, role badge (Admin / Member / Guest / Child)
- Guest members: amber "Guest · expires in X days" pill
- Child members: PIN indicator
- Admin actions per row: Edit (opens `MemberSheet`), Remove (opens `AlertDialog` confirmation)

**MemberSheet** (admin only, existing component):
- Role picker
- 12 permission toggles
- Child PIN change (nested sheet, children only)
- Remove member

**Add buttons below the list:**
- "Invite member" — opens `InviteMemberSheet`
- "Invite guest" — premium-gated; opens `InviteGuestSheet` if premium, shows `PremiumGate` feature="guests" if free
- "Add child account" — opens `AddChildSheet`

---

### 6. Categories
Admin only. Non-admins see read-only lists of active categories.

Single nav item. Two stacked sub-sections:

**Expense Categories** (green #22C55E sub-header)
- Active custom categories: name, icon, color swatch; Edit and Delete buttons per row
- Inline edit mode: name input, icon picker (30 Lucide icons), color picker (10 swatches)
- Pending member suggestions: name, suggested by; Approve and Reject buttons
- "Add category" button: premium-gated. Free users see an inline upgrade nudge.
- API: `GET/POST /api/expenses/categories`, `PATCH/DELETE /api/expenses/categories/[id]`

**Chore Categories** (red #EF4444 sub-header)
- Same structure as Expense Categories
- Inline edit: name input, icon picker (29 Lucide icons from `CHORE_ICON_MAP`), color picker
- API: `GET/POST /api/chore-categories`, `PATCH/DELETE /api/chore-categories/[id]`

---

### 7. Billing
Available to all users. Content varies by subscription status.

**Free tier:** Current plan card (free plan, usage bars for Chores/Members/Grocery lists/Reminders showing X/Y used), upgrade CTA card ($4.99/month or $39.99/year), feature grid (8 cards from `PREMIUM_GATE_CONFIG`).

**Premium — active:** Plan card with Active badge, next billing date, Cancel plan link. Cancel link opens a retention sheet listing what the household will lose, with "Keep Premium" and "Cancel anyway" options.

**Premium — cancelling:** Amber warning card showing when premium expires. Reactivate button.

All Stripe interactions route through existing API endpoints (`/api/stripe/*`). Customer Portal link available for payment management.

---

### 8. Promotions
Available to all users.

- Promo code input: monospace font, auto-uppercase, with "Redeem" button. `POST /api/promo-codes/redeem`.
- Info note below input: "When your promotion expires, your household returns to the free plan unless you subscribe."
- Active promo status cards: code name, duration ("30 days" or "Never expires" with Infinity icon for lifetime codes), Active badge, redeemed date. Data from `GET /api/promo-codes/status`.

---

### 9. Privacy & Data
Available to all users.

Two actions:

**Export my data**
Triggers a download of the current user's personal data as JSON: profile, chore completions, task completions, activity log entries. Does not include household-wide data. Button: "Download my data". `GET /api/user/export` (new endpoint).

**Delete my account**
Removes the user from all households they belong to and permanently deletes their account. If the user is the sole admin of a household, they must transfer admin or delete the household first (server returns a descriptive 400 if this constraint is violated, with a clear error message).

Confirmation dialog requires typing the user's email address before the delete button enables. `DELETE /api/user/account` (new endpoint).

---

### 10. Stats Visibility
Admin only.

Six toggles controlling which charts and widgets appear on the `/stats` page for all household members:
- Leaderboard
- Chores chart
- Expenses chart
- Tasks chart
- Meals chart
- Grocery chart

Toggle color: #6366F1 (indigo, stats section color) when on. Changes apply immediately via `PATCH /api/household/[id]/stats-visibility` (new endpoint, stores a JSON config column on `households`).

---

### Danger Zone
Admin only. Not a nav item. Rendered as a red-bordered card at the very bottom of the page, below all nav sections.

Two destructive actions:

**Delete all household data**
Wipes all content (chores, expenses, tasks, notes, grocery items, etc.) but keeps the household row and all members. Requires typing "DELETE" into a confirmation input before the button enables. `POST /api/household/[id]/delete-data`.

**Delete household entirely**
Permanently removes the household and all associated data. All members lose access. Requires typing "DELETE". `DELETE /api/household/[id]`.

---

## Data Flow

- Profile data: `GET /api/user/profile` on mount, `PATCH` on each field save
- Household + members: `GET /api/household/members` on mount
- Promo status: `GET /api/promo-codes/status` on mount
- Categories: `GET /api/expenses/categories` + `GET /api/chore-categories` on mount
- Billing: `GET /api/household/me` for subscription status (already cached via `useHousehold()`)
- Stats visibility: `GET /api/household/me` includes the visibility config

All mutations invalidate the relevant TanStack Query keys on success. Sonner toasts on success and error (error toasts always include a description).

---

## New API Endpoints Required

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/user/export` | GET | Download personal data as JSON |
| `/api/user/account` | DELETE | Delete own account |
| `/api/household/[id]/stats-visibility` | PATCH | Update stats chart visibility config |

Schema change: `households.stats_visibility` — JSON column storing the 6 toggle states. Default: all enabled.

---

## Component Breakdown

Reused from V1 (already exist in `apps/web/src/`):
- `MemberSheet`, `MemberAvatar`, `DraggableSheet`, `PremiumGate`, `SlabCard`
- `AddChildSheet`, `InviteGuestSheet`, `InviteMemberSheet`
- `AlertDialog` (ui/alert-dialog)

New components:
- `SettingsSectionNav` — sticky left nav with scroll-tracking active state
- `PasswordChangeForm` — expandable inline password form with strength meter
- `CategorySubSection` — reusable sub-section for expense and chore categories (takes a color prop)
- `StatsVisibilityToggles` — the 6 indigo toggles
- `PrivacyDataSection` — export + delete account flows

---

## Error Handling

- Network errors on any save: sonner `toast.error()` with description
- Email already taken: inline field error below the email input
- Transfer admin — sole admin constraint: clear error message, no dialog close until resolved
- Delete account — sole admin constraint: descriptive 400 response shown as toast with instructions
- Geolocation denied: toast explaining that location permission was denied, preferences unchanged

---

## Out of Scope

- Connected accounts / OAuth (no social login in V2)
- Session management (no multi-session UI)
- In-app keyboard shortcut settings
- Any Stripe UI on iOS/Android (Apple 3.1.1 compliance — billing section hidden in Expo build)
