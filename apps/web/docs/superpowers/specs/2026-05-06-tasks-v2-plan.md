# Tasks V2 Implementation Plan

**Spec:** `docs/superpowers/specs/2026-05-06-tasks-v2-design.md`
**Date:** 2026-05-06
**Branch:** feature/phase1-web

---

## Overview

Replace the current v2 tasks page (simple list, no subtasks, no delegation) with the full competitive feature set: projects, subtasks, delegation, due time, recurring, quick capture NLP, comments, and household Today view.

All work is in `apps/web/`. The existing tasks schema and API routes are extended in-place; nothing is deleted.

---

## Phase 1: Schema

### Task 1 — Extend `tasks` table
**File:** `apps/web/src/db/schema/tasks.ts`

Add columns to the existing tasks table:
- `project_id` text nullable FK → projects
- `parent_task_id` text nullable FK → tasks (self-referential)
- `due_time` text nullable (HH:MM)
- `recurring` boolean default false
- `frequency` text nullable
- `repeat_end_type` text nullable
- `repeat_until` timestamp nullable
- `repeat_occurrences` integer nullable
- `completed_at` timestamp nullable
- `completed_by` text nullable FK → users

### Task 2 — Add `projects` table
**File:** `apps/web/src/db/schema/tasks.ts`

New table in same file:
```
id, household_id, created_by, name, color, archived (bool, default false), created_at, deleted_at
```

### Task 3 — Add `task_comments` table
**File:** `apps/web/src/db/schema/tasks.ts`

```
id, task_id, household_id, user_id, body (text, max 2000), created_at, deleted_at
```

### Task 4 — Add `task_delegations` table
**File:** `apps/web/src/db/schema/tasks.ts`

```
id, task_id, household_id, from_user_id, to_user_id, status ('pending'|'accepted'|'declined'), created_at, responded_at
```

### Task 5 — Export tables from schema index and run db:push
**File:** `apps/web/src/db/schema/index.ts`

Add exports for projects, task_comments, task_delegations. Then run:
```
cd apps/web && npm run db:push
```

---

## Phase 2: Utilities

### Task 6 — Create `parseTaskInput` NLP utility
**File:** `apps/web/src/lib/utils/parseTaskInput.ts`

```ts
export interface ParsedTask {
  title: string
  dueDate: string | null   // ISO date
  dueTime: string | null   // HH:MM
  priority: 'high' | 'medium' | 'low' | null
}

export function parseTaskInput(raw: string): ParsedTask
```

Parse order: priority → time → date → remainder as title.

Priority patterns: `\bhigh\b`, `\bmed(ium)?\b`, `\blow\b` (case-insensitive, remove from string)
Time patterns: `\b(\d{1,2})(:\d{2})?\s*(am|pm)\b`, `\b(\d{2}):(\d{2})\b`
Date patterns: today, tomorrow, mon/tue/wed/thu/fri/sat/sun (next occurrence), `jan \d+`, `\d+/\d+`

Use date-fns `nextDay`, `addDays`, `parseISO` where needed. Never throws — returns full input as title if nothing matches.

---

## Phase 3: API Routes

### Task 7 — Update `GET /api/tasks`
**File:** `apps/web/src/app/api/tasks/route.ts`

- Join projects (left join, return project name + color)
- Join subtasks (left join tasks on parent_task_id = task.id, return as subtasks[])
- Return pending delegation for current user (left join task_delegations where to_user_id = session.userId AND status = 'pending')
- Return comment count (count task_comments where task_id = task.id AND deleted_at IS NULL)
- Support `?projectId=` filter param
- Support `?filter=mine|assigned|today` query params
- Expand recurring tasks: same pattern as calendar (expandTasksForRange from a new `src/lib/utils/taskRecurrence.ts`)

### Task 8 — Update `POST /api/tasks`
**File:** `apps/web/src/app/api/tasks/route.ts`

Accept new fields: `project_id`, `parent_task_id`, `due_time`, `recurring`, `frequency`, `repeat_end_type`, `repeat_until`, `repeat_occurrences`.

Depth guard: if `parent_task_id` is provided, check that the referenced task itself has no `parent_task_id`. Return 400 if violated.

### Task 9 — Update `PATCH /api/tasks/[id]`
**File:** `apps/web/src/app/api/tasks/[id]/route.ts`

Accept new fields from Task 8. On complete: set `completed_at` + `completed_by`. On recurring complete: advance template's next occurrence (add `taskRecurrence.ts` util — same expand-on-fetch pattern).

### Task 10 — Add `GET + POST /api/tasks/projects`
**File:** `apps/web/src/app/api/tasks/projects/route.ts`

- GET: return all non-archived, non-deleted projects for household, with task counts
- POST: create project (name, color required), check `FREE_TIER_LIMITS.taskProjects` (3) server-side

### Task 11 — Add `PATCH + DELETE /api/tasks/projects/[id]`
**File:** `apps/web/src/app/api/tasks/projects/[id]/route.ts`

- PATCH: rename, recolor, archive (admin or creator)
- DELETE: soft delete (admin only); set `project_id = null` on all tasks in that project first

### Task 12 — Add `POST /api/tasks/[id]/delegate`
**File:** `apps/web/src/app/api/tasks/[id]/delegate/route.ts`

- Create `task_delegations` row (`status: 'pending'`)
- If existing pending delegation exists for this task, mark it `declined` first (replace)
- Log activity: `task_delegated`

### Task 13 — Add `PATCH /api/tasks/delegations/[id]/respond`
**File:** `apps/web/src/app/api/tasks/delegations/[id]/respond/route.ts`

- Accept `{ status: 'accepted' | 'declined' }`
- On accepted: update `task.assigned_to = delegation.to_user_id`, set `responded_at`
- On declined: set status, `responded_at` only
- Only the `to_user_id` can call this (403 otherwise)

### Task 14 — Add `GET + POST /api/tasks/[id]/comments`
**File:** `apps/web/src/app/api/tasks/[id]/comments/route.ts`

- GET: return comments with user name + avatar, newest first
- POST: insert comment (body required, max 2000 chars), log activity

### Task 15 — Add `DELETE /api/tasks/comments/[id]`
**File:** `apps/web/src/app/api/tasks/comments/[id]/route.ts`

- Soft delete (author or admin only)

---

## Phase 4: Components

### Task 16 — Create `TaskQuickCapture`
**File:** `apps/web/src/components/tasks/TaskQuickCapture.tsx`

Props: `onAdd: (parsed: ParsedTask) => Promise<void>`, `color: string`

- Slab input, `h-11`, pink border-bottom on focus
- Hint text: "Add a task... or try 'dentist fri 3pm high'"
- On Enter or click of `↵` button: call `parseTaskInput`, then `onAdd`
- Show brief flash on the parsed chips (due date / priority) to confirm NLP worked
- Clear input after submit

### Task 17 — Create `TaskTabRow`
**File:** `apps/web/src/components/tasks/TaskTabRow.tsx`

Props: `projects: Project[]`, `activeTab: string`, `onTabChange: (tab: string) => void`, `onProjectCreate: (name: string, color: string) => void`

Tabs: `'all' | 'today' | projectId | 'new'`

- Horizontal scroll, `overflow-x-auto scrollbar-none`
- Active pill: pink bg, white text; inactive: surface bg, muted text
- Project pills: show 8px color dot before name
- `+ Project` pill: tapping it activates inline creation mode (renders `ProjectCreateInline`)
- Today pill: shows count badge if tasks due today > 0

### Task 18 — Create `ProjectCreateInline`
**File:** `apps/web/src/components/tasks/ProjectCreateInline.tsx`

Props: `onSave: (name: string, color: string) => void`, `onCancel: () => void`

- Renders inside the tab row (not a sheet)
- Text input for name + 6 color swatches (hex: `#EC4899 #3B82F6 #F59E0B #22C55E #A855F7 #F97316`)
- Enter to save, Escape to cancel
- Inline, no modal

### Task 19 — Create `DelegationBanner`
**File:** `apps/web/src/components/tasks/DelegationBanner.tsx`

Props: `delegation: PendingDelegation`, `onAccept: () => void`, `onDecline: () => void`

- Pink-tinted slab card (`background: '#EC4899' + '0F'`, border-bottom pink)
- Shows from user name + task title
- Accept button (pink slab), Decline button (light pink)
- `framer-motion` entrance: `y: -8 → 0`, opacity `0 → 1`

### Task 20 — Create `SubtaskList`
**File:** `apps/web/src/components/tasks/SubtaskList.tsx`

Props: `subtasks: Subtask[]`, `taskId: string`, `color: string`, `onToggle: (id: string, completed: boolean) => void`, `onAdd: (title: string) => void`

- 30px left indent from parent
- Smaller checkbox: 14px square, 4px radius, pink at 40% unfilled / pink solid filled
- 12px/600 text
- "Add subtask" inline link at bottom (PlusCircle icon, pink)
- Inline input appears on tap — Enter saves, Escape cancels

### Task 21 — Update `TaskSheet`
**File:** `apps/web/src/components/tasks/TaskSheet.tsx`

Add fields: project selector (pill row), due time input (appears when due date is set), recurrence toggle + `RecurringTaskFields` sub-component (Lock icon for free users), subtask list within the sheet (view + add inline).

`RecurringTaskFields`: same pattern as `RecurringFields` in EventSheet. Frequency pills (daily/weekly/biweekly/monthly/yearly), end type pills, until-date or after-N inputs.

### Task 22 — Create `DelegationSheet`
**File:** `apps/web/src/components/tasks/DelegationSheet.tsx`

Props: `open: boolean`, `onClose: () => void`, `taskId: string`, `members: Member[]`

- Member picker: avatar grid, excludes self and current assignee
- Pink slab button per member
- On select: POST `/api/tasks/[id]/delegate`, show success toast, close

### Task 23 — Create `TaskCommentSheet`
**File:** `apps/web/src/components/tasks/TaskCommentSheet.tsx`

Props: `open: boolean`, `onClose: () => void`, `taskId: string`, `taskTitle: string`

- List of comments (avatar + name + relativeTime + body)
- Textarea at bottom + Send button (pink slab)
- Soft delete via swipe/long-press (author or admin)
- Polling via `useQuery` with `refetchInterval: 10000`

### Task 24 — Create `ProjectSettingsSheet`
**File:** `apps/web/src/components/tasks/ProjectSettingsSheet.tsx`

Props: `open: boolean`, `onClose: () => void`, `project: Project`

- Name input (editable)
- 6 color swatches
- Archive toggle
- Delete button (admin only, with AlertDialog confirm)

---

## Phase 5: Page Rebuild

### Task 25 — Rebuild `apps/web/src/app/(app)/tasks/page.tsx`

Full replacement. Structure:

```
<PageHeader> Tasks </PageHeader>
<TaskQuickCapture onAdd={handleQuickAdd} color={TASKS_COLOR} />
<TaskTabRow ... />
{pendingDelegation && <DelegationBanner ... />}
{activeTab === 'today' ? <HouseholdTodayView /> : <TaskListView />}
```

**State:**
- `activeTab` — current filter / project
- `upgradeCode` — for PremiumGate sheet
- `commentTaskId` — opens TaskCommentSheet
- `delegateTaskId` — opens DelegationSheet

**Queries:**
- `["tasks"]` — GET /api/tasks (with subtasks, comment count, pending delegations)
- `["projects"]` — GET /api/tasks/projects
- `["members"]` — existing household members query

**Sections (TaskListView):**
- Overdue (red header `#EF4444`)
- Due today (pink header `#EC4899`)
- Upcoming
- No due date
- Completed (collapsed by default)

Each section uses task rows with `SubtaskList` nested. Each task footer row: avatar + "Name · N comments" (tapping opens TaskCommentSheet) + Delegate button (tapping opens DelegationSheet) + Edit button.

**HouseholdTodayView:**
All tasks due today across all members, grouped by member name. Member name as section header (avatar + name). Same task row component.

**handleQuickAdd:** calls `parseTaskInput`, then `POST /api/tasks` with parsed fields, optimistic insert.

**Premium gates:**
- Recurring toggle in TaskSheet → `onUpgradeRequired('RECURRING_TASKS_PREMIUM')`
- Project creation at limit → `onUpgradeRequired('TASKS_PROJECTS_LIMIT')`
- `{!!upgradeCode && <PremiumGate feature="tasks" trigger="sheet" onClose={() => setUpgradeCode(null)} />}`

---

## Phase 6: Premium Gate Config

### Task 26 — Update `premiumGateConfig.ts`
**File:** `apps/web/src/lib/constants/premiumGateConfig.ts`

Add `RECURRING_TASKS_PREMIUM` entry to the tasks feature config perks list:
- "Recurring tasks (daily, weekly, monthly)"

### Task 27 — Update `freeTierLimits.ts`
**File:** `apps/web/src/lib/constants/freeTierLimits.ts`

Add: `taskProjects: 3`

### Task 28 — Update `premiumGating.ts`
**File:** `apps/web/src/lib/utils/premiumGating.ts`

Add: `checkTaskProjectsLimit(householdId)` — counts non-archived, non-deleted projects, returns `{ ok, current, limit }`.

---

## Phase 7: Verification

### Task 29 — TypeScript check
```
cd apps/web && npx tsc --noEmit
```
Fix any errors before marking complete.

### Task 30 — Manual smoke test (golden paths)
- Quick capture: type "dentist fri 3pm high" → verify date/time/priority parsed correctly
- Create project → verify tab pill appears
- Create task in project → verify it appears under project tab
- Add subtask → verify it nests under parent
- Delegate task to another member → verify delegation banner appears for recipient
- Accept delegation → verify task.assigned_to updates
- Comment on task → verify count in footer increments
- Today tab → verify tasks grouped by member
- Recurring task creation (premium) → verify Lock icon for free users

---

## Commit Strategy

Each phase is one commit:
1. `feat(tasks): extend schema with projects, subtasks, delegations, comments`
2. `feat(tasks): add parseTaskInput NLP utility`  
3. `feat(tasks): add project and delegation API routes`
4. `feat(tasks): add comment API routes`
5. `feat(tasks): add TaskQuickCapture, TaskTabRow, DelegationBanner components`
6. `feat(tasks): add SubtaskList, DelegationSheet, TaskCommentSheet, ProjectSettingsSheet`
7. `feat(tasks): rebuild tasks page with all v2 features`
8. `feat(tasks): wire premium gates for recurring tasks and project limits`

---

## Files Changed Summary

**New files:**
- `src/lib/utils/parseTaskInput.ts`
- `src/lib/utils/taskRecurrence.ts`
- `src/app/api/tasks/projects/route.ts`
- `src/app/api/tasks/projects/[id]/route.ts`
- `src/app/api/tasks/[id]/delegate/route.ts`
- `src/app/api/tasks/delegations/[id]/respond/route.ts`
- `src/app/api/tasks/[id]/comments/route.ts`
- `src/app/api/tasks/comments/[id]/route.ts`
- `src/components/tasks/TaskQuickCapture.tsx`
- `src/components/tasks/TaskTabRow.tsx`
- `src/components/tasks/ProjectCreateInline.tsx`
- `src/components/tasks/DelegationBanner.tsx`
- `src/components/tasks/SubtaskList.tsx`
- `src/components/tasks/DelegationSheet.tsx`
- `src/components/tasks/TaskCommentSheet.tsx`
- `src/components/tasks/ProjectSettingsSheet.tsx`

**Modified files:**
- `src/db/schema/tasks.ts` — extend + add 3 new tables
- `src/db/schema/index.ts` — export new tables
- `src/app/api/tasks/route.ts` — GET + POST extended
- `src/app/api/tasks/[id]/route.ts` — PATCH extended
- `src/components/tasks/TaskSheet.tsx` — add project/time/recurrence/subtasks
- `src/app/(app)/tasks/page.tsx` — full rebuild
- `src/lib/constants/freeTierLimits.ts` — add taskProjects: 3
- `src/lib/constants/premiumGateConfig.ts` — add recurring tasks perk
- `src/lib/utils/premiumGating.ts` — add checkTaskProjectsLimit
