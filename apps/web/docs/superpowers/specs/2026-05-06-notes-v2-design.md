# Notes V2 Design Spec

**Date:** 2026-05-06
**Feature color:** `#A855F7` (purple), dark `#7C28C8`
**Status:** Design approved, pending implementation plan

---

## Overview

Rebuild the v2 notes page from a plain textarea masonry grid into a competitive note-taking feature with rich text editing, tags, personal/household tab split, pinning, and search. Benchmarked against Apple Notes, Bear, and Google Keep — with household-specific angles the competitors don't have.

---

## Decisions Made

| Question | Answer |
|----------|--------|
| Sharing model | Personal by default; individual notes can be shared with household |
| Organization | Tags (stored as JSON array on note, typed in dedicated field) |
| Rich text | Tiptap (already a dependency from v1) |
| Sharing UX | Two tabs: My Notes + Household |
| Pinning | Yes — pin icon on card, pinned notes float to top of their tab |
| Search | Yes — client-side, filters title + content + tags instantly |

---

## Schema

### Changes to `notes` table
**File:** `apps/web/src/db/schema/notes.ts`

Add three columns:
```
is_shared   boolean NOT NULL DEFAULT false
is_pinned   boolean NOT NULL DEFAULT false
tags        text nullable   -- JSON string array: '["grocery","house"]'
```

No new tables. Tags live on the note as a JSON array. At household scale (tens of notes, not thousands) a normalized tags table adds complexity with no benefit.

---

## Page Layout

**Route:** `/notes`

```
PageHeader: "Notes" + note count badge + search icon + new button
─────────────────────────────────────────────────────────────────
Tab row: [My Notes] [Household (N)]
Tag filter pills: [All] [#grocery] [#house] [#ideas] ...
─────────────────────────────────────────────────────────────────
★ Pinned section (only shown when pinned notes exist)
  Masonry grid of pinned notes (purple border-bottom)
─────────────────────────────────────────────────────────────────
Masonry grid of unpinned notes
─────────────────────────────────────────────────────────────────
EmptyState (when no notes in current tab/filter)
FAB (mobile, opens NoteSheet)
```

**Tab row:** Two tabs — "My Notes" (default) and "Household" with count badge. Active tab: purple bg, white text. Inactive: `#f3e8ff` bg, purple text. Tab style matches the page header, not floating pills — tabs are flush-bottom, part of the header block.

**Tag filter pills:** Horizontal scroll row, `overflow-x-auto scrollbar-none`. "All" pill always first (active = purple, inactive = surface). Tag pills built from all distinct tags across the current tab's notes. Tapping a tag filters the masonry grid. Active tag pill has purple bg, white text.

**Pinned section:** Only rendered when `isPinned` notes exist in the current tab. Section header: star icon (Lucide `Star`, filled purple, 12px) + "Pinned" label (11px/800/purple, uppercase). Pinned note cards have `borderBottom: 3px solid ${COLOR}` (purple) to distinguish from unpinned.

**Masonry grid:** CSS `columns` layout, same as current v2. `columns-1 sm:columns-2 lg:columns-3` inside `PageContainer`. Gap 12px. `breakInside: 'avoid'` on each card.

**Note cards (NoteCard):** `SlabCard` with purple border-bottom. Content: title (800/15px), preview (first 200 chars of content with HTML stripped, 600/13px/secondary color), tags as purple pill badges, footer row (creator first name + "Shared" indicator if `is_shared`, pin icon button on right).

**Search:** Magnifier icon button in page header. Tapping it expands an inline search input (animated width: 0 → full). Client-side filter: matches `title + stripHtml(content) + tags.join(' ')` against query. Clears when input is emptied or dismissed. No API call.

**Empty states:**
- My Notes (no notes at all): "Blank slate." / "No notes yet. Write something down before you forget it." / button "New note"
- My Notes (tag filter active, no match): "Nothing tagged #[tag]." / "No notes with that tag yet." (no button)
- Household (no shared notes): "Nothing shared yet." / "Share a note with the household and it will appear here." (no button)

---

## NoteSheet

All note creation and editing happens in `DraggableSheet` (same pattern as all other feature sheets). `featureColor={COLOR}`.

**Fields:**
1. **Title** — text input, placeholder "Give it a name"
2. **Content** — `RichTextEditor` (Tiptap, same component as v1) with full toolbar: bold, italic, strike, H1-H3, bullet list, numbered list, task list (checklists), blockquote, code block, link, undo/redo. `autofocus: false` (iOS Safari rule).
3. **Tags** — text input, placeholder "Add tags (grocery, house, ideas...)". User types comma-separated tag names without `#`. Stored lowercase, trimmed. Display shows `#` prefix on cards only.
4. **Share with household** — toggle row with Share2 icon. Off by default. When on: note appears in Household tab for all members.

**View mode (existing note):** Same sheet, all fields populated. Auto-save on content change (500ms debounce, same as v1 rich text pattern). Checkboxes in task lists are interactive in view mode (`editable=true, hideToolbar=true` while viewing — show toolbar on tap).

**Pin action:** Pin icon button in the sheet header (top-right). Tapping it toggles `is_pinned` immediately (optimistic).

**Save button:** "Save note" (create) or changes auto-saved (edit). Matches purple slab style.

**Permissions:** Creator or admin can edit/delete/share/pin. Members who can see a shared Household note cannot edit it unless they are the creator or admin. Children: `notes.add` permission required (same as v1).

---

## Key Flows

### Tagging
1. User opens NoteSheet (create or edit)
2. Types tags in Tags field: `"grocery, ideas"`
3. On save: split by comma, trim, lowercase → `["grocery", "ideas"]`
4. Stored in `notes.tags` as JSON string
5. Tag filter pills rebuild from `SELECT DISTINCT unnest(tags)` across all non-deleted notes in the tab

### Sharing a Note
1. User opens NoteSheet, flips "Share with household" toggle ON
2. `is_shared = true` saved to DB
3. Note appears in Household tab for all household members
4. Note card shows "Shared" indicator in footer (Share2 icon, 10px, purple)
5. Creator can toggle back off (sets `is_shared = false`); admin can also unshare any note

### Pinning
1. User taps pin icon on NoteCard footer OR in NoteSheet header
2. Optimistic update: `is_pinned` toggles immediately
3. PATCH `/api/notes/[id]` with `{ is_pinned: true/false }`
4. Pinned notes move to Pinned section at top of current tab
5. Pinned section disappears when no pinned notes exist in that tab

### Search
1. User taps magnifier icon in page header
2. Search input expands inline (framer-motion width animation)
3. Typing filters notes in the current tab (client-side, no API call)
4. Match against: `title + stripHtml(content) + tags.join(' ')` (case-insensitive)
5. Tag filter pills are hidden while search is active
6. X button clears search, restores normal view

---

## API Routes

| Method | Route | Change |
|--------|-------|--------|
| GET | `/api/notes` | Add `?tab=mine\|household` param. `mine`: `created_by = userId AND deleted_at IS NULL`. `household`: `is_shared = true AND household_id = X AND deleted_at IS NULL`. Return `tags` field. |
| POST | `/api/notes` | Accept `tags` (string array), `is_shared` (bool). |
| PATCH | `/api/notes/[id]` | Accept `tags`, `is_shared`, `is_pinned`. |
| DELETE | `/api/notes/[id]` | No change. |

No new routes. All changes are additive to existing routes.

**Tag filter data:** Distinct tags for the filter pills come from client-side extraction across the fetched notes array — no separate API endpoint needed. `Array.from(new Set(notes.flatMap(n => n.tags ?? [])))`.

---

## Components

| Component | File | Description |
|-----------|------|-------------|
| `NotesPage` | `app/(app)/notes/page.tsx` | Full rebuild: tabs, tag filter, search, pinned section, masonry grid |
| `NoteCard` | inline or `components/notes/NoteCard.tsx` | SlabCard with title, preview, tags, footer (creator, shared badge, pin button) |
| `NoteSheet` | `components/notes/NoteSheet.tsx` | DraggableSheet: title, RichTextEditor, tags field, share toggle, pin button |
| `RichTextEditor` | `apps/web/src/components/notes/RichTextEditor.tsx` | Port from v1 `src/components/notes/RichTextEditor.tsx` unchanged — Tiptap editor with full toolbar |
| `NoteTagPills` | inline in page | Tag filter row: "All" + extracted tags, horizontal scroll |

---

## Permissions

- **Children:** `notes.add` permission required to create. Can view household notes. Cannot edit/delete others' notes.
- **Members:** Full CRUD on own notes. View all household (shared) notes. Cannot edit/delete others' notes.
- **Admin:** Full CRUD on all notes.
- **Free tier limit:** 10 notes total (`FREE_TIER_LIMITS.notes`); gate triggers on POST with `NOTES_LIMIT` error code.
- **Rich text:** Free (Tiptap is free, no cost gate).
- **Tags, pinning, sharing:** Free, no limit.

---

## Free Tier Limits

| Limit | Value |
|-------|-------|
| Total notes (personal) | 10 |
| Tags per note | Unlimited |
| Pinned notes | Unlimited |
| Shared (household) notes | Unlimited |
| Rich text | Free |

---

## Design System Compliance

All components follow established Roost patterns:
- `PageHeader` for page title + badge + actions
- `PageContainer` (max-w-4xl) wrapping all content
- `SlabCard` for note cards
- `EmptyState` with `color={COLOR}` prop for empty views
- `DraggableSheet` for all sheets (`featureColor={COLOR}`)
- Colors imported from `src/lib/constants/colors.ts` (never hardcoded)
- CSS variables for all background/surface/text colors
- Lucide icons only, no emojis
- 48px minimum touch targets (64px for list rows)
- framer-motion: page enter `y:12→0 opacity:0→1 duration:0.18`, list stagger `delay: Math.min(i*0.04, 0.2)`
- No em dashes, no double hyphens in any copy

---

## What This Is Not

- No collaborative real-time editing (last-write-wins on shared notes is acceptable)
- No note templates
- No file/image attachments
- No note export (PDF/markdown)
- No nested notes or notebooks
- No public sharing outside the household
