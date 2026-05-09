# Clear Cart — Design Spec

**Date:** 2026-05-09
**Status:** Approved

## Problem

Checked items accumulate in the "IN THE CART" section indefinitely. Users have no way to remove them in bulk — they must delete items one at a time with the trash icon.

## Solution

Add a "Clear" text button to the "IN THE CART" toggle row. Tapping it opens a confirmation dialog, then removes all checked items from the list permanently (soft delete via existing API).

## Behavior

### Button placement

The "Clear" button sits inline in the "IN THE CART (N)" toggle row, between the label and the chevron:

```
IN THE CART (3)  ────────────────  Clear  ⌄
```

- Only rendered when `checked.length > 0`
- Plain text, no border or background
- Style: `12px / fontWeight 700 / color: var(--roost-text-muted)`
- `e.stopPropagation()` on click so it does not toggle the section

### Confirmation dialog (AlertDialog)

Title: `Clear cart?`
Body: `This will remove all N checked items from your list.` (N = live count)
Actions: `Cancel` (secondary) and `Clear` (amber slab button, destructive)

### On confirm

1. Optimistic update: remove all checked items from `grocery-items` query cache immediately
2. `POST /api/grocery/lists/[id]/clear` (endpoint already exists)
3. On success: invalidate `grocery-items` and `grocery-lists` query keys
4. On error: revert cache to previous state + `toast.error('Could not clear cart', { description: 'Check your connection and try again.' })`

## What is NOT changing

- Individual item delete (trash icon) is unchanged
- Uncheck behavior (tapping the circle) is unchanged
- The `POST /api/grocery/lists/[id]/clear` API route is unchanged
- No new API routes, no schema changes

## Files affected

- `src/app/(app)/lists/page.tsx` — add `clearMutation`, AlertDialog state, and "Clear" button in the cart toggle row
