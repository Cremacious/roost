# Calendar V2 Design Spec

**Date:** 2026-05-05
**Feature:** Calendar page — full Google Calendar replacement
**Status:** Approved, ready for implementation

---

## Overview

Upgrade the existing calendar from a basic event viewer into a first-class household calendar. Key additions: event categories with color-coding, attendee tagging with optional RSVP, per-event push notifications, and a location field. Mobile switches from a week strip to an agenda-first layout. Desktop keeps the month grid.

---

## Decisions Log

| Topic | Decision |
|---|---|
| Views | Month + Agenda |
| Categories | 10 presets, hardcoded constants (no DB table) |
| Mobile layout | Agenda-first + compact horizontal date scroller |
| Desktop layout | Full month grid (unchanged) |
| Attendees | Per-event member tagging, optional RSVP |
| Notifications | Creator picks who to notify at save time, push via Expo |
| Location | Free-text field, no map integration |

---

## 1. Schema Changes

All changes are additive to existing tables. Run `npm run db:push` after applying.

### `calendar_events` — new columns

```ts
category: text('category'),               // one of 10 preset slugs, nullable
location: text('location'),               // free text, nullable
notify_member_ids: text('notify_member_ids'), // JSON array of user IDs, or "all", nullable
rsvp_enabled: boolean('rsvp_enabled').default(false),
```

### `event_attendees` — new column

```ts
rsvp_status: text('rsvp_status'), // 'attending' | 'not_attending' | 'maybe' | null
```

### Categories constant (no DB table)

`src/lib/constants/calendarCategories.ts`

```ts
export const CALENDAR_CATEGORIES = [
  { slug: 'medical',       label: 'Medical',       color: '#EF4444' },
  { slug: 'school',        label: 'School',         color: '#3B82F6' },
  { slug: 'work',          label: 'Work',           color: '#8B5CF6' },
  { slug: 'sports',        label: 'Sports',         color: '#F97316' },
  { slug: 'family',        label: 'Family',         color: '#22C55E' },
  { slug: 'social',        label: 'Social',         color: '#EC4899' },
  { slug: 'travel',        label: 'Travel',         color: '#06B6D4' },
  { slug: 'food',          label: 'Food',           color: '#EAB308' },
  { slug: 'entertainment', label: 'Entertainment',  color: '#A855F7' },
  { slug: 'other',         label: 'Other',          color: '#94A3B8' },
] as const;

export type CalendarCategorySlug = typeof CALENDAR_CATEGORIES[number]['slug'];
```

No-category events default to calendar blue `#3B82F6`.

---

## 2. EventSheet

### New fields (added below existing time inputs, in order)

**Category**
Scrollable row of pill buttons. Each pill: colored dot + label. Tapping selects; tapping again deselects (category is optional). Active pill: solid category color background, white text. Inactive: `#F1F5F9` background, `#475569` text.

**Location**
Single text input with `MapPin` icon prefix. Placeholder: "Add a location". Nullable.

**Who's going (Attendees)**
Member chip multi-select. Shows all household members except the creator. Each chip: avatar + first name. Selected state: `#EFF6FF` background, `#BAD3F7` border, `#1E40AF` text.

When at least one attendee is selected, a **RSVP toggle row** appears below the chips:
- Label: "Ask for RSVP" with a checkmark icon
- Subtitle: "Attendees can mark attending, maybe, or no"
- Toggle maps to `rsvp_enabled` on the event

**Notify when saved**
Bell icon header + chip row. First chip: "All household" (selects everyone, dark fill). Then one chip per household member. Selected members receive a push notification when the event is saved.

Stored as `notify_member_ids` JSON array. "All household" stores the string `"all"`. Edit mode: only fires push if `start_time`, `end_time`, or `location` changed.

### Desktop layout (860px two-column)
Left column: all form fields (title, all-day, date/time, category, location, attendees, RSVP, notify, save button).
Right column: always-visible calendar date picker (existing behavior, unchanged).

### Mobile layout
Single column. Date picker collapses after date selection (existing behavior, unchanged).

---

## 3. API Changes

### `POST /api/calendar` and `PATCH /api/calendar/[id]`
Accept and persist: `category`, `location`, `notify_member_ids`, `rsvp_enabled`.

On create/edit, after saving the event:
1. Read `notify_member_ids` from the saved event
2. If `"all"`, fetch all household member user IDs
3. Fetch `push_token` for each target user from the `users` table
4. Fire Expo push notifications for tokens that are non-null
5. Payload: `{ title: event.title, body: "New event: {date} at {time}{location}" }`
6. Edit mode: skip notification if date, time, and location are all unchanged

### `PATCH /api/calendar/[id]/rsvp` (new route)
Body: `{ rsvp_status: 'attending' | 'not_attending' | 'maybe' }`
Auth: must be an attendee of the event. Updates `event_attendees.rsvp_status` for the current user.
Returns the updated attendee row.

### `GET /api/calendar`
Add to response per event: `category`, `location`, `rsvp_enabled`, and RSVP summary on attendees (`rsvp_status` per attendee).

---

## 4. Calendar Grid (Desktop)

**Event pills**
Swap from flat blue to category color. No category = `#3B82F6` (calendar blue). Pill format unchanged: colored background at 15% opacity, text at full category color, 11px, border-bottom slab.

**Category filter row**
Horizontal scrollable pill row above the month grid, replacing nothing (new row). Contains:
- "All" pill (always first, dark fill when active)
- One pill per category that has at least one event in the current month view
- Active pill: solid category color, white text
- Tapping a category hides all other events; tapping again clears

Filter is client-side only — no API call needed, just filters the already-fetched events array.

---

## 5. Mobile Layout (Agenda-first)

### Date scroller strip
Compact horizontal strip at the top of the calendar page on mobile. One row of date pills:
- Day letter above (M/T/W etc.)
- Day number
- Small dot below if the date has events
- Today: filled blue circle
- Selected date: `#DBEAFE` background, `#1D4ED8` text

Month label sits above the strip, updates as the user scrolls. Strip scrolls horizontally; advancing past the last date in the month advances to the next month.

Tapping a date scrolls the agenda list to that date's section.

### Agenda list
Default view on mobile (`block md:hidden`). Same as existing Agenda view — events grouped by date, sticky date headers. Each event card:
- 4px left border in category color (no category = calendar blue)
- Event title, time, location (if set)
- RSVP chips below title when `rsvp_enabled` and user is an attendee: "Going", "Maybe", "Can't make it"
- Creator sees RSVP summary: "Sarah: Going · Jake: Maybe"

Month grid is `hidden md:block` — desktop only.

### View toggle
The existing Month/Agenda toggle is hidden on mobile. On desktop it remains.

---

## 6. DaySheet

Event cards in DaySheet gain:
- Category color dot next to event title
- Location line (MapPin icon, 11px muted text) when present
- RSVP row when `rsvp_enabled` and current user is an attendee
- RSVP summary (for event creator): "Sarah: Going · Jake: Maybe · Mike: No response"

---

## 7. Permissions

No changes to the existing permission model. `calendar.add` permission gates creation. Children remain view-only. RSVP (`PATCH /api/calendar/[id]/rsvp`) requires the user to be in `event_attendees` for that event.

---

## 8. Premium Gating

No new premium gates. Categories, location, attendees, RSVP, and notifications are all free features. The existing `CALENDAR_LIMIT` (20 events/month for free tier) and `RECURRING_EVENTS_PREMIUM` gate are unchanged.

---

## 9. Testing

- Create event with category, location, attendees, RSVP on, notify Sarah
- Verify: event pill in month grid shows category color
- Verify: Sarah receives push notification (check Expo dashboard)
- Verify: Sarah sees RSVP buttons on the event in her agenda view
- Verify: creator sees Sarah's RSVP status after she responds
- Verify: category filter pill appears and correctly hides/shows events
- Mobile: agenda loads by default, date strip scrolls and jumps correctly
- Edit event: change time, verify notification fires again; change only title, verify no notification
