# Editable Common Items on the Lists Page

Date: 2026-05-25
Status: Approved (design)

## Problem

The Lists page shows a "COMMON ITEMS" chip grid for quick-adding popular
grocery items (Milk, Eggs, Bread, etc.). Today these are a hardcoded twelve-
string array in the page (`COMMON_ITEMS`), identical for every user. There is
no way to add, rename, or remove items, so households cannot maintain their own
shared list defaults.

## Goals

- Common items become household-shared and persisted.
- Add, rename, and delete from a clear edit surface.
- Tapping a chip still quick-adds to the active list (no regression).
- Edit UX matches the rest of the Lists experience (sheet-based, slab pills,
  amber accent).

## Non-goals (out of scope)

- Per-item categories, icons, or sort sections.
- Default quantity or unit.
- Drag-to-reorder.
- Importing/sharing common items across households.

## Chosen approach

A small pencil-icon button next to the "COMMON ITEMS" header opens a
`DraggableSheet` titled "Common items." The sheet contains an add row at the
top and a vertical list of existing items, each with rename and delete actions.
Tapping a chip in the page continues to quick-add to the current list — only
the management surface is new.

## Data model

One new table:

```
common_items
  id           text primary key (uuid via $defaultFn)
  household_id text not null, references households(id) on delete cascade
  name         text not null
  created_at   timestamp default now
  deleted_at   timestamp  -- soft delete
```

Index on `(household_id, deleted_at)` for the list query. Push via
`npm run db:push`.

## API

All routes require an authenticated session and a non-child household member
with the `grocery.add` permission (matches the gate on the grocery add-item
route). The active household is resolved via `getUserHousehold`.

- `GET /api/grocery/common-items`
  Returns `{ items: { id, name }[] }` for non-deleted rows in the caller's
  household, ordered by `created_at`. Lazy-seeds the twelve defaults if the
  household has no rows yet (same pattern as `seedChoreCategories`).
- `POST /api/grocery/common-items` body `{ name }`
  Validation: `name.trim()` non-empty, length 1-60, case-insensitive uniqueness
  within the household (409 with `code: 'DUPLICATE'` on collision).
  Returns `{ id, name }`.
- `PATCH /api/grocery/common-items/[id]` body `{ name }`
  Same validation. 404 if the row is not in the caller's household or is
  soft-deleted.
- `DELETE /api/grocery/common-items/[id]`
  Soft delete (sets `deleted_at`). 404 as above.

## Permissions

Anyone with `grocery.add` (a non-child member by default) can manage common
items. Lower-stakes than categories, matches the gate that already controls
adding items to grocery lists. Children remain blocked.

## Seeding

- On household create: insert the existing twelve defaults
  (`Milk, Eggs, Bread, Butter, Chicken breast, Pasta, Rice, Olive oil, Onions,
  Garlic, Bananas, Cheese`) for that household.
- For households that predate this feature: a lazy-seed inside the GET handler
  inserts the same defaults the first time it sees the household has **zero
  total rows in `common_items`** (including soft-deleted). Counting every row
  (not just non-deleted) is important: once a household has had any item — even
  one that was later deleted — the household is considered initialized, so a
  user who deletes every default never sees them resurrected on next open.

Lift the twelve defaults into a shared constant (e.g.
`src/lib/constants/commonItems.ts`) so the page, the seed-on-create call, and
the lazy-seed handler all reference one source.

## UI

- `src/app/(app)/lists/page.tsx`
  - Replace the hardcoded `COMMON_ITEMS` constant with a TanStack Query against
    `GET /api/grocery/common-items` (single source of truth for the chip grid).
  - Add a small pencil-icon button next to each "COMMON ITEMS" header (the
    section appears in two layout variants in the page; both get the button).
  - Tapping the button opens the new `CommonItemsSheet`.
- `src/components/grocery/CommonItemsSheet.tsx` (new)
  - `DraggableSheet` with `featureColor="#F59E0B"` (grocery amber).
  - Top: "+ Add a common item" row with a text input (placeholder "e.g. Yogurt")
    and a small amber add button. Enter or click submits.
  - Below: vertical list of items. Each row shows the name, with a small inline
    rename pencil and a trash button. Pencil swaps the name into an inline
    input + Save/Cancel. Trash opens an `AlertDialog` ("Remove [name]?") with
    a Remove button.
  - Toast on add/rename/delete via `sonner`. Optimistic updates with TanStack
    Query, with rollback on error.
- Visual conventions: slab pill chrome on the add button, amber section color,
  no emojis, no em dashes (per project rules).

## Edge cases

- Empty list (all deleted): the sheet shows "No common items yet" muted text;
  the add row stays available.
- Duplicate name (case-insensitive): inline error in the sheet plus a toast
  "Already in your common items."
- Name length: client and server cap at 60 characters; trim whitespace.
- Concurrent edits between users: last write wins on rename; delete and rename
  by different users in the same second are not coordinated (acceptable for the
  scale; the optimistic UI handles the common case).

## Testing

- Typecheck and lint must remain clean across the touched files.
- A Playwright E2E (single spec) drives the API as the free admin: GET seeds
  defaults on first call, POST adds a new item, PATCH renames it, DELETE soft-
  deletes it, GET no longer returns it. Re-uses the existing `e2e/global-setup`
  free-admin auth state.
- Manual UI smoke (post-implementation): open the sheet on /lists, add a
  custom item, see it as a chip, rename it, delete it, confirm the chips
  refetch.
