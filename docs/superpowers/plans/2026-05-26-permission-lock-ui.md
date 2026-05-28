# Permission Lock UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a single visible lock affordance to every action button gated by a household permission, app-wide, so users always understand when something is restricted and why.

**Architecture:** One client-side hook `usePermissionGate(permission)` reads the existing `useHousehold()` role + permissions and returns `{ allowed, onBlocked }`. A small documented visual convention (Lucide `Lock` icon, `opacity: 0.55`, `cursor: 'not-allowed'`, `aria-disabled="true"`, click routed to `onBlocked` toast when locked) is applied at every affected trigger. No new wrapper component — Roost's buttons vary too much in shape — but the convention itself is what produces the consistency.

**Tech Stack:** Next.js 16 client components, TanStack Query (used by `useHousehold`), `sonner` for toasts, `lucide-react` (`Lock` icon), TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-26-permission-lock-ui-design.md`

**Testing note:** This repo has no unit-test runner — only Playwright E2E (`npm run test:e2e`), TypeScript (`npx tsc --noEmit`), and ESLint (`npm run lint`). Every task is verified with typecheck + lint + a targeted manual smoke. No new E2E spec needed — the behavior is deterministic gating over data already served by `/api/household/me` and the per-site changes are small visual edits.

**Conventions to follow:** Lucide icons only, no emojis. No em dashes or double hyphens in any UI copy. Toasts via `sonner`. CSS variables for theme colors. The lock convention is defined exactly once in Task 1 and every surface task references it.

---

### Task 1: usePermissionGate hook + PermissionKey type + shared convention

**Files:**
- Create: `src/lib/hooks/usePermissionGate.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/lib/hooks/usePermissionGate.ts
'use client'

import { toast } from 'sonner'
import { useHousehold } from '@/lib/hooks/useHousehold'

/**
 * Canonical permission-key strings used across the app. These match the
 * dot-form strings emitted by /api/household/me (see the mapping in
 * src/app/api/household/me/route.ts) and exposed via useHousehold().permissions.
 */
export type PermissionKey =
  | 'expenses.view'
  | 'expenses.add'
  | 'chores.add'
  | 'chores.edit'
  | 'grocery.add'
  | 'grocery.create_list'
  | 'calendar.add'
  | 'calendar.edit'
  | 'tasks.add'
  | 'notes.add'
  | 'meals.plan'
  | 'meals.suggest'

export interface PermissionGate {
  /** True if the caller may perform this action. Admins always true. */
  allowed: boolean
  /** Click handler for a locked button. Fires the shared lock toast. */
  onBlocked: () => void
}

/**
 * Returns whether the current user may perform `permission`, and a click
 * handler to use when they cannot. The shared lock toast points users at
 * admin member settings so the restriction reads as configurable.
 *
 * Visual convention for callers (apply at the locked trigger):
 *   - Replace the leading icon with Lucide `Lock` at the same size.
 *   - Set `opacity: 0.55` and `cursor: 'not-allowed'`.
 *   - Set `aria-disabled="true"`. DO NOT use the HTML `disabled` attribute;
 *     it would suppress the click and the toast would never fire.
 *   - Route the click to `onBlocked` when `!allowed`.
 *
 * While the household query is loading the action is treated as locked.
 * That state is brief and avoids a click reaching a handler the server
 * would reject.
 */
export function usePermissionGate(permission: PermissionKey): PermissionGate {
  const { role, permissions, isLoading } = useHousehold()

  // Admins short-circuit, mirroring server-side checkMemberPermission.
  if (role === 'admin') {
    return { allowed: true, onBlocked: noop }
  }

  const allowed = !isLoading && permissions.includes(permission)

  return {
    allowed,
    onBlocked: () => {
      toast.error("You don't have permission to do that.", {
        description: 'Ask an admin to enable it in member settings.',
      })
    },
  }
}

function noop(): void {}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no NEW errors. Pre-existing `MemberSheet.tsx` "member possibly null" errors are unrelated.

- [ ] **Step 3: Lint the new file**

Run: `npx eslint src/lib/hooks/usePermissionGate.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/hooks/usePermissionGate.ts
git commit -m "feat: usePermissionGate hook for app-wide permission lock UI"
```

## The lock-application template (used by every following task)

For every button covered by Tasks 2-8, find the button in its file and apply this exact transformation:

**Before** (existing button shape — adapt the names but the structure is the same):

```tsx
<button
  onClick={handleAction}
  style={{
    /* ...existing styling, including any leading icon... */
  }}
>
  <Plus size={14} />
  Add chore
</button>
```

**After** (with the lock convention):

```tsx
const { allowed, onBlocked } = usePermissionGate('chores.add')

<button
  onClick={allowed ? handleAction : onBlocked}
  aria-disabled={!allowed}
  style={{
    /* ...existing styling unchanged... */
    opacity: allowed ? 1 : 0.55,
    cursor: allowed ? 'pointer' : 'not-allowed',
  }}
>
  {allowed ? <Plus size={14} /> : <Lock size={14} />}
  Add chore
</button>
```

Notes the implementer MUST observe:

- Add `Lock` to the existing `lucide-react` import in the file. Do NOT add a second import line for it.
- Add `import { usePermissionGate } from '@/lib/hooks/usePermissionGate'` to the file.
- Keep the existing button styling intact; only **append** `opacity` and `cursor` to the existing style object. If the button already sets `opacity` or `cursor` for a different reason (e.g., loading state), preserve that and only override when `!allowed`.
- For icon-only buttons (no text label), replace the entire icon when locked.
- For buttons with a leading icon AND text, replace the leading icon when locked (text stays).
- Never use the HTML `disabled` attribute. Use `aria-disabled`.

---

### Task 2: money page — expenses.view (section gate) + expenses.add (button)

**Files:**
- Modify: `src/app/(app)/money/page.tsx`

The money page already has a child block: when `role === 'child'`, it renders a friendly "Money stuff is for grown-ups" panel and returns early. This task adds an analogous gate for non-admin members whose `expenses.view` is off, and applies the lock convention to the "Add expense" header button.

- [ ] **Step 1: Add the hook imports near the top of `src/app/(app)/money/page.tsx`**

Add `Lock` to the existing `lucide-react` import. Then add:

```typescript
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
```

- [ ] **Step 2: Section gate for `expenses.view`**

The `MoneyPage` default export currently does `const { isPremium, role } = useHousehold()` then handles `if (role === 'child')` by returning a centered panel. Right after that child block (still before any member-only data fetching), add:

```tsx
  const { allowed: canViewExpenses } = usePermissionGate('expenses.view')
  if (!canViewExpenses) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: '1.5px solid var(--roost-border)', borderBottom: '4px solid var(--roost-border-bottom)' }}>
          <Lock size={28} color="var(--roost-text-muted)" strokeWidth={2} />
        </div>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>You do not have permission to view expenses.</p>
        <p style={{ margin: '10px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--roost-text-secondary)', lineHeight: 1.5, maxWidth: 320 }}>
          Ask an admin to enable it in member settings.
        </p>
      </div>
    )
  }
```

This matches the visual shape of the existing child-block panel and renders before any expense data is requested.

- [ ] **Step 3: Apply the lock convention to the "Add expense" header button**

In `src/app/(app)/money/page.tsx`, find the "Add expense" button in the page header (it has the literal text "Add expense" and currently uses a `Plus` icon). Apply the template from Task 1 with `permission = 'expenses.add'`.

Concretely:

a) Add `const { allowed: canAddExpense, onBlocked: onBlockedAddExpense } = usePermissionGate('expenses.add')` near the existing hook calls in `MoneyPage`.

b) Modify the "Add expense" button. Replace its `onClick={() => setExpenseSheetOpen(true)}` with `onClick={canAddExpense ? () => setExpenseSheetOpen(true) : onBlockedAddExpense}`. Add `aria-disabled={!canAddExpense}`. Append `opacity: canAddExpense ? 1 : 0.55, cursor: canAddExpense ? 'pointer' : 'not-allowed'` to its existing inline `style`. Change the leading `<Plus size={15} />` to `{canAddExpense ? <Plus size={15} /> : <Lock size={15} />}`.

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npx eslint "src/app/(app)/money/page.tsx"`
Expected: no NEW errors. (The file has pre-existing react-hooks/rules-of-hooks warnings on the early-return structure that are not introduced by this change.)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/money/page.tsx"
git commit -m "feat: permission lock on money page (expenses.view + expenses.add)"
```

---

### Task 3: chores page — chores.add (header button) + chores.edit (per-row pencil)

**Files:**
- Modify: `src/app/(app)/chores/page.tsx`

The chores page has a primary "Add chore" CTA in the header and an inline edit pencil on each chore row. Both follow the same template.

- [ ] **Step 1: Add imports**

Add `Lock` to the existing `lucide-react` import in `src/app/(app)/chores/page.tsx`. Then add:

```typescript
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
```

- [ ] **Step 2: Hook calls**

Inside the default exported page component (or wherever the buttons live in the existing structure), add:

```typescript
  const { allowed: canAddChore, onBlocked: onBlockedAddChore } = usePermissionGate('chores.add')
  const { allowed: canEditChore, onBlocked: onBlockedEditChore } = usePermissionGate('chores.edit')
```

- [ ] **Step 3: Apply the convention to the "Add chore" header button**

Find the "Add chore" button (looks like an icon-only round button or an icon+label CTA in the page header; uses a `Plus` icon today). Apply the template from Task 1 with `permission = 'chores.add'`, using `canAddChore` / `onBlockedAddChore`.

If the button is currently icon-only (no text), the lock fully replaces the `Plus` icon. If it has a label, the lock replaces the leading icon only.

- [ ] **Step 4: Apply the convention to the per-row edit pencil**

Each chore row has an edit button identified by a `Pencil` icon (or whatever inline edit icon the row uses; if the codebase uses `Edit2` or similar, that's the one). Apply the template with `permission = 'chores.edit'`, using `canEditChore` / `onBlockedEditChore`. The lock replaces the existing icon entirely (icon-only button).

The per-row button is inside a list `.map(...)`. Compute `canEditChore` / `onBlockedEditChore` once at the page level — call the hook once outside the loop — and reuse the values inside the loop. Do NOT call the hook inside `.map()`.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(app)/chores/page.tsx"`
Expected: no new errors or warnings on this file.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/chores/page.tsx"
git commit -m "feat: permission lock on chores page (chores.add + chores.edit)"
```

---

### Task 4: lists page — grocery.add + grocery.create_list

**Files:**
- Modify: `src/app/(app)/lists/page.tsx`
- Modify: `src/components/grocery/CommonItemsSheet.tsx` (sheet "Add" button uses the same gate)

The grocery experience has three locked triggers:
1. The quick-add bar (input + amber circular `+` button) at the top of the active list.
2. The "Add" button inside `CommonItemsSheet`.
3. The "+ Shopping List" pill / new-list trigger (gated by `grocery.create_list`, not `grocery.add`).

- [ ] **Step 1: Add imports to `src/app/(app)/lists/page.tsx`**

Add `Lock` to the existing `lucide-react` import. Then add:

```typescript
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
```

- [ ] **Step 2: Hook calls in the page**

Near the other hook calls, add:

```typescript
  const { allowed: canAddItem, onBlocked: onBlockedAddItem } = usePermissionGate('grocery.add')
  const { allowed: canCreateList, onBlocked: onBlockedCreateList } = usePermissionGate('grocery.create_list')
```

- [ ] **Step 3: Lock the quick-add bar (grocery.add)**

The quick-add bar at the top of the active list has an input and an inline amber circular `+` button. The handler that runs on Enter or `+` click should be wrapped so that when `!canAddItem` it fires `onBlockedAddItem` instead. Concretely:

a) The input's `onKeyDown` Enter handler and the `+` button's `onClick` both call the same `handleQuickAdd` (or whatever the existing handler is named). Wrap each call site:

```typescript
onClick={canAddItem ? handleQuickAdd : onBlockedAddItem}
onKeyDown={(e) => { if (e.key === 'Enter') { canAddItem ? handleQuickAdd() : onBlockedAddItem() } }}
```

b) On the `+` button, append `opacity: canAddItem ? 1 : 0.55, cursor: canAddItem ? 'pointer' : 'not-allowed'` to the existing style, set `aria-disabled={!canAddItem}`, and swap the icon: `{canAddItem ? <Plus size={14} ... /> : <Lock size={14} ... />}`. Keep the input itself enabled (it does not need to be locked visually — the lock affordance lives on the `+` button which carries the action).

- [ ] **Step 4: Lock the "+ Shopping List" pill (grocery.create_list)**

The `lists` header includes a pill or button to create a new list, labeled along the lines of "+ Shopping List". Find it and apply the template from Task 1 with `permission = 'grocery.create_list'`, using `canCreateList` / `onBlockedCreateList`. The leading icon (`Plus`) is replaced with `Lock` when locked.

- [ ] **Step 5: Lock the CommonItemsSheet "Add" button (grocery.add)**

Open `src/components/grocery/CommonItemsSheet.tsx`. Add the imports:

```typescript
import { Lock } from 'lucide-react' // add to existing lucide import line; do not duplicate
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
```

Then near the top of the `CommonItemsSheet` component (after the existing `useQueryClient`/`useQuery` calls), add:

```typescript
  const { allowed: canAddItem, onBlocked: onBlockedAddItem } = usePermissionGate('grocery.add')
```

Apply the template to the sheet's amber "Add" button (the one wrapped in `<motion.button ... whileTap={{ y: 1 }} ... >...Add</motion.button>`):

- `onClick={canAddItem ? submitAdd : onBlockedAddItem}`
- `aria-disabled={!canAddItem}`
- append `opacity: canAddItem ? (addMut.isPending || !newName.trim() ? 0.5 : 1) : 0.55, cursor: canAddItem ? 'pointer' : 'not-allowed'` (preserves the existing pending-state opacity)
- Swap the leading icon: `{canAddItem ? <Plus size={16} ... /> : <Lock size={16} ... />}`

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(app)/lists/page.tsx" src/components/grocery/CommonItemsSheet.tsx`
Expected: no new errors. (Pre-existing unused-var warnings on lists/page.tsx are not your concern.)

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/lists/page.tsx" src/components/grocery/CommonItemsSheet.tsx
git commit -m "feat: permission lock on lists page (grocery.add + grocery.create_list)"
```

---

### Task 5: calendar — calendar.add (page + DaySheet) + calendar.edit (EventSheet)

**Files:**
- Modify: `src/app/(app)/calendar/page.tsx`
- Modify: `src/components/calendar/DaySheet.tsx`
- Modify: `src/components/calendar/EventSheet.tsx`

The calendar has three locked triggers: the page's primary "Add event" trigger, the DaySheet's "Add event" button, and the EventSheet's "Save" button when the sheet is in edit mode for an existing event.

- [ ] **Step 1: Imports in calendar/page.tsx**

Add `Lock` to the existing `lucide-react` import in `src/app/(app)/calendar/page.tsx`. Then add:

```typescript
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
```

- [ ] **Step 2: Hook call and locked "Add event" trigger on the page**

Near the other hook calls in the page component, add:

```typescript
  const { allowed: canAddEvent, onBlocked: onBlockedAddEvent } = usePermissionGate('calendar.add')
```

Find the page-level "Add event" trigger (typically a button with a `Plus` icon in the page header or near the month/agenda toggle). Apply the template from Task 1 with `permission = 'calendar.add'`, using `canAddEvent` / `onBlockedAddEvent`.

- [ ] **Step 3: Lock the DaySheet "Add event" button**

Open `src/components/calendar/DaySheet.tsx`. Add the imports:

```typescript
import { Lock } from 'lucide-react' // add to the existing lucide import line
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
```

Inside the `DaySheet` component, add:

```typescript
  const { allowed: canAddEvent, onBlocked: onBlockedAddEvent } = usePermissionGate('calendar.add')
```

Find the "Add event" button in the sheet body. Apply the template with `canAddEvent` / `onBlockedAddEvent`.

- [ ] **Step 4: Lock the EventSheet "Save changes" button when in edit mode**

Open `src/components/calendar/EventSheet.tsx`. Edit mode is detected via a prop like `event` being non-null or a local boolean such as `isEdit`. The "Save event" / "Save changes" button at the bottom should be locked when the user lacks `calendar.edit`.

Add the imports:

```typescript
import { Lock } from 'lucide-react' // add to the existing lucide import line
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
```

Inside the component, add:

```typescript
  const { allowed: canEditEvent, onBlocked: onBlockedEditEvent } = usePermissionGate('calendar.edit')
```

The lock applies **only when the sheet is in edit mode for an existing event**. The same Save button in "new event" mode is gated by `calendar.add` (which the page-level trigger already handles by gating the sheet's opening). So the lock condition is: `isEditMode && !canEditEvent`.

Wrap the Save button so that:

- When `isEditMode && !canEditEvent`: `onClick = onBlockedEditEvent`, leading icon is `Lock`, opacity 0.55, `aria-disabled="true"`.
- Otherwise: existing behavior.

If the Save button currently has no leading icon, simply prepend a `Lock` icon in the locked branch (do NOT add a permanent icon to the unlocked branch — keep the existing look).

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(app)/calendar/page.tsx" src/components/calendar/DaySheet.tsx src/components/calendar/EventSheet.tsx`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/calendar/page.tsx" src/components/calendar/DaySheet.tsx src/components/calendar/EventSheet.tsx
git commit -m "feat: permission lock on calendar (calendar.add + calendar.edit)"
```

---

### Task 6: tasks page — tasks.add

**Files:**
- Modify: `src/app/(app)/tasks/page.tsx`

The tasks page has one locked trigger: the "Add task" header button.

- [ ] **Step 1: Add imports**

Add `Lock` to the existing `lucide-react` import. Then add:

```typescript
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
```

- [ ] **Step 2: Hook call**

Inside the page component, add:

```typescript
  const { allowed: canAddTask, onBlocked: onBlockedAddTask } = usePermissionGate('tasks.add')
```

- [ ] **Step 3: Apply the template to the "Add task" button**

Find the "Add task" header button (icon-only or icon+label, currently using a `Plus` icon). Apply the template from Task 1 with `permission = 'tasks.add'`, using `canAddTask` / `onBlockedAddTask`.

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(app)/tasks/page.tsx"`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/tasks/page.tsx"
git commit -m "feat: permission lock on tasks page (tasks.add)"
```

---

### Task 7: notes page — notes.add

**Files:**
- Modify: `src/app/(app)/notes/page.tsx`

The notes page has two related locked triggers: the quick-add bar at the top, and any "New note" / "+ note" CTA. Both are gated by `notes.add`.

- [ ] **Step 1: Add imports**

Add `Lock` to the existing `lucide-react` import. Then add:

```typescript
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
```

- [ ] **Step 2: Hook call**

Inside the page component, add:

```typescript
  const { allowed: canAddNote, onBlocked: onBlockedAddNote } = usePermissionGate('notes.add')
```

- [ ] **Step 3: Lock the quick-add bar**

The notes quick-add bar has a textarea/input plus a submit affordance (button or Enter key). Mirror the grocery quick-add pattern from Task 4: wrap the submit handler with `canAddNote ? handler : onBlockedAddNote`, set `aria-disabled` on the submit affordance, append `opacity` / `cursor`, swap the leading icon for `Lock` when locked.

- [ ] **Step 4: Lock any additional "+ New note" CTA**

If the page exposes a separate header CTA or FAB to create a note (in addition to the quick-add bar), apply the same template to it as well.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(app)/notes/page.tsx"`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/notes/page.tsx"
git commit -m "feat: permission lock on notes page (notes.add)"
```

---

### Task 8: meals page — meals.plan + meals.suggest

**Files:**
- Modify: `src/app/(app)/meals/page.tsx`

The meals page has a Planner tab (gated by `meals.plan`) and a Suggestions tab (gated by `meals.suggest`). Each tab exposes its own action triggers.

- [ ] **Step 1: Add imports**

Add `Lock` to the existing `lucide-react` import. Then add:

```typescript
import { usePermissionGate } from '@/lib/hooks/usePermissionGate'
```

- [ ] **Step 2: Hook calls**

Inside the page component, add:

```typescript
  const { allowed: canPlanMeal, onBlocked: onBlockedPlanMeal } = usePermissionGate('meals.plan')
  const { allowed: canSuggestMeal, onBlocked: onBlockedSuggestMeal } = usePermissionGate('meals.suggest')
```

- [ ] **Step 3: Lock the planner triggers (meals.plan)**

Within the Planner tab content, find every trigger that opens a slot picker, an "Add meal to planner" CTA, or a meal-bank "Add to planner" affordance. Each is gated by `meals.plan`. Apply the template from Task 1 with `canPlanMeal` / `onBlockedPlanMeal`. Empty planner slot taps that currently open the `MealSlotSheet` are the most important — replace their `onClick` with `canPlanMeal ? openSlot : onBlockedPlanMeal`, and append the opacity + cursor + aria-disabled treatment to the slot card style. The slot's existing content (e.g., "Tap to plan") stays; if there is a leading icon, swap it for `Lock` when locked.

The "+ Add Meal To Planner" button in the week-nav row is the clearest single trigger; apply the template there directly.

- [ ] **Step 4: Lock the "Suggest a meal" trigger (meals.suggest)**

Within the Suggestions tab content (or wherever the "Suggest a meal" CTA lives), find the button that opens `SuggestionSheet`. Apply the template with `canSuggestMeal` / `onBlockedSuggestMeal`.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(app)/meals/page.tsx"`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/meals/page.tsx"
git commit -m "feat: permission lock on meals page (meals.plan + meals.suggest)"
```

---

### Task 9: CLAUDE.md docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a documentation subsection**

Add a new "## Permission Lock UI" section immediately after the existing "## Permission Rules" section. Exact content:

```markdown
## Permission Lock UI
- Any client-side trigger gated by a household permission MUST use
  `usePermissionGate(permission)` from `src/lib/hooks/usePermissionGate.ts`.
- The convention for a locked button:
  - Replace the leading icon with Lucide `Lock` at the same size.
  - Append `opacity: 0.55` and `cursor: 'not-allowed'` to the button style.
  - Set `aria-disabled="true"`. Never use the HTML `disabled` attribute —
    that would suppress the click and the toast would not fire.
  - Route the click to `onBlocked` (which fires the shared lock toast)
    when `!allowed`.
- The shared toast is `"You don't have permission to do that."` with
  description `"Ask an admin to enable it in member settings."`. Do not
  invent per-permission strings.
- Admins always pass (`role === 'admin'`).
- This is distinct from the premium gate (`PremiumGate` component, opens an
  upgrade sheet). If a button is somehow gated by both, the permission gate
  runs first because no amount of upgrading grants a permission the admin
  has disabled.
- Applied surfaces and their permission keys: expenses.view / expenses.add
  (money page), chores.add / chores.edit (chores page), grocery.add /
  grocery.create_list (lists page + CommonItemsSheet), calendar.add (page +
  DaySheet) / calendar.edit (EventSheet save-in-edit-mode), tasks.add,
  notes.add, meals.plan / meals.suggest.
```

- [ ] **Step 2: Final typecheck + lint sweep across the feature files**

Run:
```
npx tsc --noEmit
npx eslint src/lib/hooks/usePermissionGate.ts "src/app/(app)/money/page.tsx" "src/app/(app)/chores/page.tsx" "src/app/(app)/lists/page.tsx" src/components/grocery/CommonItemsSheet.tsx "src/app/(app)/calendar/page.tsx" src/components/calendar/DaySheet.tsx src/components/calendar/EventSheet.tsx "src/app/(app)/tasks/page.tsx" "src/app/(app)/notes/page.tsx" "src/app/(app)/meals/page.tsx"
```
Expected: no NEW errors anywhere. Pre-existing `MemberSheet.tsx` errors and pre-existing react-hooks/rules-of-hooks warnings on money/page.tsx are unrelated; ignore them.

- [ ] **Step 3: Manual smoke (post-implementation)**

With the dev server running and signed in as a non-admin member:

1. As an admin, disable each of the 12 permissions for that member in `MemberSheet`.
2. As the member, visit each affected screen and confirm: the relevant button shows a lock icon, is visually dimmed, and tapping it fires the shared toast.
3. Re-enable each permission and confirm the lock disappears and the normal action works.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document permission lock UI convention in CLAUDE.md"
```

---

## Notes for the implementer

- The convention block in Task 1 is the single source of truth. If a surface
  task seems ambiguous about which button to change, re-read the spec
  (`docs/superpowers/specs/2026-05-26-permission-lock-ui-design.md`) — the
  "Affected surfaces" table there pins each button to its permission.
- Always call `usePermissionGate` at the component top level. Never inside a
  loop, condition, or callback (React hooks rule). For lists, call once and
  reuse the returned `allowed` / `onBlocked` inside the loop.
- Never use the HTML `disabled` attribute on a locked button. `aria-disabled`
  + the lock visuals communicate the state without suppressing the click that
  fires the toast.
- The visual treatment is the same at every site. Do not add per-surface
  styling tweaks (no custom toast strings, no different lock sizes than the
  existing icon's, no different opacity numbers). Consistency is the feature.
