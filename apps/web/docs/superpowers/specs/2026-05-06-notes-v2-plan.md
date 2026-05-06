# Notes V2 Implementation Plan

**Spec:** `docs/superpowers/specs/2026-05-06-notes-v2-design.md`
**Branch:** `feature/phase1-web`
**Base path:** `apps/web/src/`

---

## Current State

- `app/(app)/notes/page.tsx` — Quick add bar, masonry grid, inline NoteCard + NoteSheet (plain textarea only). No tabs, tags, pinning, or search.
- `app/api/notes/route.ts` — GET (newest first, creator join) + POST (50k char limit, activity log)
- `app/api/notes/[id]/route.ts` — PATCH + DELETE (creator or admin, soft delete)
- `db/schema/notes.ts` — id, householdId, title, content, isRichText, createdBy, createdAt, updatedAt, deletedAt. No tags/sharing/pinning.
- `components/notes/` — empty (no components extracted yet)

---

## Phase 1: Schema

### Task 1 — Add columns to `notes` table

**File:** `apps/web/src/db/schema/notes.ts`

Add three columns:
```ts
isShared: boolean('is_shared').notNull().default(false),
isPinned: boolean('is_pinned').notNull().default(false),
tags:     text('tags'),   // nullable JSON string: '["grocery","house"]'
```

After editing the file, run `npm run db:push` from `apps/web/` to sync Neon.

---

## Phase 2: API Updates

All changes are additive — no breaking changes to existing callers.

### Task 2 — Update GET `/api/notes`

**File:** `apps/web/src/app/api/notes/route.ts`

- Read `?tab=mine|household` query param (default `mine`)
- `mine`: `WHERE created_by = userId AND deleted_at IS NULL`
- `household`: `WHERE is_shared = true AND household_id = X AND deleted_at IS NULL`
- Add `isShared`, `isPinned`, `tags` to the SELECT and return shape
- Parse `tags` from JSON string to `string[]` before returning (fallback to `[]`)

### Task 3 — Update POST `/api/notes`

**File:** `apps/web/src/app/api/notes/route.ts`

- Accept `tags?: string[]` and `isShared?: boolean` in request body
- Serialize `tags` array to JSON string before insert: `JSON.stringify(tags ?? [])`
- Insert `is_shared` from `isShared ?? false`

### Task 4 — Update PATCH `/api/notes/[id]`

**File:** `apps/web/src/app/api/notes/[id]/route.ts`

- Accept `tags?: string[]`, `isShared?: boolean`, `isPinned?: boolean`
- Update only fields present in body (partial update pattern)
- Serialize `tags` array to JSON string before update
- Permission: `isPinned` and `isShared` writable by creator or admin only
- Optimistic pin update is safe — server confirms immediately

---

## Phase 3: RichTextEditor

### Task 5 — Port RichTextEditor from v1

**Source:** `src/components/notes/RichTextEditor.tsx` (v1 app root)
**Destination:** `apps/web/src/components/notes/RichTextEditor.tsx`

Copy the file exactly. Verify imports resolve in v2 context:
- `@tiptap/react`, `@tiptap/starter-kit`, Tiptap extensions — check they are in `apps/web/package.json`
- If not present, install: `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-placeholder @tiptap/extension-code-block @tiptap/extension-blockquote @tiptap/extension-heading`
- Tiptap CSS lives in `globals.css` — confirm `.ProseMirror` styles are present in v2 `globals.css`; if not, copy them from v1

Props: `content: string`, `onChange: (html: string) => void`, `editable?: boolean`, `hideToolbar?: boolean`
`autofocus: false` hardcoded in `useEditor` (iOS Safari rule — never change this).

---

## Phase 4: NoteSheet

### Task 6 — Build `NoteSheet` component

**File:** `apps/web/src/components/notes/NoteSheet.tsx`

Extract and rebuild the note creation/editing sheet from the inline code in `notes/page.tsx`.

Props:
```ts
interface NoteSheetProps {
  open: boolean
  onClose: () => void
  note?: Note | null          // null = create mode
  members: Member[]           // for creator display / admin check
  currentUserId: string
  currentUserRole: string
  onUpgradeRequired?: (code: string) => void
}
```

Sheet structure using `DraggableSheet` (`featureColor={COLOR}`):
```
DraggableSheet
  div.px-4.pb-8
    [Header row]
      "New note" / note.title (fontWeight 800, fontSize 18, --roost-text-primary)
      [right] Pin icon button (Star, filled purple when isPinned, 44x44 touch target)
            + Delete icon button (Trash2, shown in edit mode, admin or creator only)

    [Title field]
      label "Title"
      input placeholder "Give it a name"

    [Content field]
      label "Content"
      RichTextEditor (autofocus: false, editable: true)
      View mode: hideToolbar=true while viewing, show toolbar on tap (setHideToolbar(false))

    [Tags field]
      label "Tags"
      input placeholder "Add tags (grocery, house, ideas...)"
      helper "Separate with commas. No # needed."

    [Share toggle row] (Members + Admin only, not children)
      Share2 icon + "Share with household"
      Switch (purple when on) — toggles isShared

    [Save button] (create mode only; edit mode auto-saves)
      "Save note" — purple slab, full width
```

State:
- `title`, `content` (HTML string), `tagsInput` (raw comma string), `isShared`, `isPinned`
- `hideToolbar` (boolean, starts true in view mode)

Behaviors:
- **Create:** POST on save button click. Tags: split by comma, trim, lowercase, filter empty.
- **Edit (auto-save):** `useEffect` on `content` change, 500ms debounce, PATCH `/api/notes/[id]`. Same debounce for title and tagsInput.
- **Pin toggle:** PATCH `/api/notes/[id]` with `{ isPinned: !isPinned }` immediately (optimistic — invalidate `["notes"]` on settle).
- **Delete:** AlertDialog confirm "Delete this note?", then DELETE, close sheet, invalidate `["notes"]`.
- Form labels: `color: '#374151'`, `fontWeight: 700` (all sheet labels rule).
- Never use `autoFocus` on any input.

---

## Phase 5: NoteCard

### Task 7 — Build `NoteCard` component

**File:** `apps/web/src/components/notes/NoteCard.tsx`

Props:
```ts
interface NoteCardProps {
  note: Note
  canModify: boolean
  onOpen: (note: Note) => void
  onPinToggle: (note: Note) => void
}
```

Layout inside `SlabCard` (purple `borderBottom` when pinned, neutral when not):
```
[Title]  fontWeight 800, 15px, --roost-text-primary
[Preview] first 200 chars of stripHtml(content), 13px, 600, --roost-text-secondary, lineHeight 1.5
[Tags row] tag pills: background #f3e8ff, color #A855F7, 10px, 700, padding 2px 7px, borderRadius 6px
[Footer row]
  left: creatorName (first name only), 11px, --roost-text-muted
        + Share2 icon (10px, purple) + "Shared" if isShared
  right: Star icon button (filled purple if isPinned, outline if not), 44x44 touch target
         whileTap={{ y: 1 }}
```

Tapping the card body (not the pin button) calls `onOpen`.
Pin button calls `onPinToggle` with `stopPropagation`.
`stripHtml`: `content.replace(/<[^>]+>/g, '')`.

---

## Phase 6: NotesPage Rebuild

### Task 8 — Rebuild `notes/page.tsx`

**File:** `apps/web/src/app/(app)/notes/page.tsx`

Full rewrite. Keep `'use client'` directive and existing import structure as a starting point.

**State:**
```ts
const [activeTab, setActiveTab] = useState<'mine' | 'household'>('mine')
const [activeTag, setActiveTag] = useState<string | null>(null)   // null = "All"
const [searchQuery, setSearchQuery] = useState('')
const [searchOpen, setSearchOpen] = useState(false)
const [selectedNote, setSelectedNote] = useState<Note | null>(null)
const [sheetOpen, setSheetOpen] = useState(false)
```

**Data fetching:**
```ts
const { data: notes = [], isLoading, isError } = useQuery({
  queryKey: ['notes', activeTab],
  queryFn: async () => {
    const r = await fetch(`/api/notes?tab=${activeTab}`)
    if (!r.ok) throw new Error('Failed')
    return r.json()
  },
  staleTime: 10_000,
  refetchInterval: 10_000,
})
```

**Client-side filtering:**
```ts
// Tag filter (hidden when search active)
const tagFilteredNotes = activeTag
  ? notes.filter(n => (n.tags ?? []).includes(activeTag))
  : notes

// Search filter (overrides tag filter when searchQuery set)
const displayedNotes = searchQuery
  ? notes.filter(n => {
      const text = `${n.title ?? ''} ${stripHtml(n.content)} ${(n.tags ?? []).join(' ')}`.toLowerCase()
      return text.includes(searchQuery.toLowerCase())
    })
  : tagFilteredNotes

// Distinct tags for pills (from all notes in current tab, not just filtered)
const allTags = Array.from(new Set(notes.flatMap(n => n.tags ?? [])))

// Split pinned / unpinned
const pinned   = displayedNotes.filter(n => n.isPinned)
const unpinned = displayedNotes.filter(n => !n.isPinned)
```

**Pin mutation (optimistic):**
```ts
const pinMutation = useMutation({
  mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
    fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned }),
    }),
  onMutate: async ({ id, isPinned }) => {
    await queryClient.cancelQueries({ queryKey: ['notes', activeTab] })
    const prev = queryClient.getQueryData<Note[]>(['notes', activeTab])
    queryClient.setQueryData<Note[]>(['notes', activeTab], old =>
      old?.map(n => n.id === id ? { ...n, isPinned } : n) ?? []
    )
    return { prev }
  },
  onError: (_err, _vars, ctx) => {
    queryClient.setQueryData(['notes', activeTab], ctx?.prev)
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['notes', activeTab] }),
})
```

**Layout structure:**
```
motion.div (page enter animation: y:12→0, opacity:0→1, duration:0.18)
  PageHeader
    title="Notes"
    badge={notes.length} color={COLOR}
    action=
      flex row gap-2:
        [Search button] magnifier icon, 44x44 slab, onClick toggles searchOpen
                        When searchOpen: animated input expands (framer-motion width 0→240px)
                        + X button to clear + close
        [New note button] Plus icon, 44x44 slab purple

  PageContainer
    [Tab row] (flush-bottom, part of header block)
      "My Notes" tab: active=purple bg/white text, inactive=#f3e8ff bg/purple text
                      border-radius 8 8 0 0, fontSize 12, fontWeight 800
      "Household" tab: same style + count badge (purple bg, white text, 10px)
      onClick switches activeTab, resets activeTag and searchQuery

    [Tag filter row] (hidden when searchQuery is set)
      overflow-x-auto scrollbar-none, flex gap-2, py-2
      "All" pill: active=purple, inactive=surface/muted
      tag pills: active=purple, inactive=surface/muted
      onClick sets activeTag (null for "All")

    [Pinned section] (only when pinned.length > 0)
      section header: Star icon (Lucide Star, fill=#A855F7, 12px) + "Pinned" (11px/800/purple, uppercase, letterSpacing 0.06em)
      masonry grid: columns-1 sm:columns-2, gap 12px
      NoteCard for each pinned note (SlabCard borderBottom: 3px solid COLOR)
      list stagger animation: delay Math.min(i * 0.04, 0.2)

    [Unpinned masonry grid]
      columns-1 sm:columns-2 lg:columns-3, gap 12px
      NoteCard for each unpinned note (SlabCard with neutral borderBottom)
      list stagger animation

    [Empty state] (when displayedNotes.length === 0)
      Three cases:
        a. My Notes, no notes at all:
           EmptyState color={COLOR} title="Blank slate."
             body="No notes yet. Write something down before you forget it."
             buttonLabel="New note" onButtonClick={() => setSheetOpen(true)}
        b. My Notes or Household, tag filter active, no match:
           EmptyState color={COLOR} title="Nothing tagged #{activeTag}."
             body="No notes with that tag yet." (no button)
        c. Household, no shared notes (tab=household, no tag filter):
           EmptyState color={COLOR} title="Nothing shared yet."
             body="Share a note with the household and it will appear here." (no button)

    [FAB] (mobile only, md:hidden)
      position fixed, bottom 80px (above bottom nav), right 20px
      48x48, borderRadius 16, backgroundColor COLOR, borderBottom 4px solid COLOR_DARK
      Plus icon, white, whileTap={{ y: 2 }}
      onClick: setSelectedNote(null); setSheetOpen(true)

  NoteSheet
    open={sheetOpen}
    onClose={() => { setSheetOpen(false); setSelectedNote(null) }}
    note={selectedNote}
    ...
```

**Opening a note:** `onOpen={(note) => { setSelectedNote(note); setSheetOpen(true) }}`
**Creating:** new button / FAB sets `selectedNote(null)`, `setSheetOpen(true)`.

---

## Phase 7: Note Type Update

### Task 9 — Update `Note` type

The `Note` interface needs the three new fields added everywhere it appears (page + NoteCard + NoteSheet):

```ts
interface Note {
  id: string
  title: string | null
  content: string
  isRichText: boolean
  isShared: boolean      // new
  isPinned: boolean      // new
  tags: string[]         // new (parsed from JSON, default [])
  createdBy: string
  createdAt: string
  updatedAt: string
  creatorName: string | null
  creatorAvatar: string | null
}
```

---

## Phase 8: Verification

### Task 10 — Design system check

Walk through the rebuilt page and confirm:
- All backgrounds/text use CSS variables (`var(--roost-surface)`, `var(--roost-text-primary)`, etc.)
- Section color (#A855F7 / #7C28C8) appears only on: buttons, active pills, tab bg, pin icon (filled), tag pills, sheet handle, card borderBottom (pinned), empty state icon box borderBottom
- No hardcoded `#fff` or `#000` for backgrounds or text
- No em dashes, no double hyphens in any copy
- No emojis anywhere — Lucide icons only
- All touch targets 48px minimum (pin button, FAB, tab buttons, new button, search button)
- Labels in NoteSheet: `color: '#374151'`, `fontWeight: 700`
- `autoFocus` not used on any input
- framer-motion: page wrapper animation, list stagger on NoteCard

### Task 11 — Flow verification

Manual check of key flows:
1. Create note with title + rich text content + tags → appears in My Notes, tags shown as pills
2. Pin note → moves to Pinned section, purple border-bottom on card
3. Share note → appears in Household tab for all members
4. Search → filters across title + content + tags, tag pills hidden
5. Tag filter → pills built from notes in current tab, click filters grid
6. Household tab → shows only is_shared=true notes, count badge updates
7. Free tier limit (10 notes) → 11th note POST returns 403 NOTES_LIMIT, sheet shows upgrade gate
8. Child user → notes.add permission gate respected (no "New note" button if missing permission)

---

## Phase 9: Commit

### Task 12 — Commit

Stage and commit all changed files:
```
apps/web/src/db/schema/notes.ts
apps/web/src/app/api/notes/route.ts
apps/web/src/app/api/notes/[id]/route.ts
apps/web/src/components/notes/RichTextEditor.tsx  (new)
apps/web/src/components/notes/NoteSheet.tsx       (new)
apps/web/src/components/notes/NoteCard.tsx        (new)
apps/web/src/app/(app)/notes/page.tsx             (full rebuild)
```

Commit message:
```
feat(notes): V2 rebuild — tabs, tags, pinning, sharing, search, rich text
```

---

## Task Summary

| # | Task | Phase |
|---|------|-------|
| 1 | Schema: add is_shared, is_pinned, tags to notes table | Schema |
| 2 | GET /api/notes: add ?tab param + new fields | API |
| 3 | POST /api/notes: accept tags + isShared | API |
| 4 | PATCH /api/notes/[id]: accept tags, isShared, isPinned | API |
| 5 | Port RichTextEditor from v1, verify Tiptap deps + CSS | Components |
| 6 | Build NoteSheet (DraggableSheet, fields, auto-save, pin, delete) | Components |
| 7 | Build NoteCard (SlabCard, preview, tags, footer, pin button) | Components |
| 8 | Rebuild NotesPage (tabs, tag filter, search, pinned section, masonry, FAB) | Page |
| 9 | Update Note type with new fields across all files | Types |
| 10 | Design system check | Verification |
| 11 | Flow verification (7 user flows) | Verification |
| 12 | Commit | Commit |
