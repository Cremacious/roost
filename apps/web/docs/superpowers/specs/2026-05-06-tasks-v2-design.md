# Tasks V2 Design Spec

**Date:** 2026-05-06
**Feature color:** `#EC4899` (pink), dark `#B02878`
**Status:** Design approved, pending implementation plan

---

## Mental Model

Personal task manager with household sharing. Each person owns their tasks; sharing is opt-in via assignment and delegation. Like Todoist with a household lens.

This contrasts with a shared whiteboard model (everyone sees everything by default) and a hybrid board model (too complex for v1). The personal-first approach maps cleanly to how people actually think about tasks, while the delegation and project features add the household layer on top.

---

## Competitive Features (all 8 included)

1. **Subtasks** — one level deep (projects → tasks → subtasks, no deeper)
2. **Delegation requests** — ask a household member to take on a task; they accept or decline
3. **Projects / Lists** — named groups shown as tab pills; shared household-wide
4. **Due time** — time stored alongside date; tasks sort correctly in Today view
5. **Recurring tasks** — expand-on-fetch pattern, same as calendar events
6. **Quick capture bar** — always-visible at top; NLP parses date/time/priority from free text
7. **Task comments / activity** — threaded comments on any task
8. **Household Today view** — "Today" tab shows all members' tasks due today, grouped by person

---

## Schema

### `projects`
```
id              text PK
household_id    text FK → households.id
created_by      text FK → users.id
name            text NOT NULL
color           text NOT NULL (hex)
archived        boolean DEFAULT false
created_at      timestamp
deleted_at      timestamp nullable
```

### `tasks`
```
id              text PK
household_id    text FK → households.id
project_id      text nullable FK → projects.id
parent_task_id  text nullable FK → tasks.id   (subtasks; max depth 1, enforced app-layer)
title           text NOT NULL
description     text nullable
assigned_to     text nullable FK → users.id
created_by      text FK → users.id
due_date        date nullable
due_time        text nullable ("HH:MM", local time, no UTC conversion)
priority        text nullable ('high' | 'medium' | 'low')
completed       boolean DEFAULT false
completed_at    timestamp nullable
completed_by    text nullable FK → users.id
recurring       boolean DEFAULT false
frequency       text nullable ('daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly')
repeat_end_type text nullable ('forever' | 'until_date' | 'after_occurrences')
repeat_until    timestamp nullable
repeat_occurrences integer nullable
created_at      timestamp
updated_at      timestamp
deleted_at      timestamp nullable
```

Depth constraint: when inserting a subtask, the API checks that `parent_task_id` itself has no `parent_task_id`. Returns 400 if violated.

### `task_comments`
```
id              text PK
task_id         text FK → tasks.id
household_id    text FK → households.id
user_id         text FK → users.id
body            text NOT NULL (max 2000 chars)
created_at      timestamp
deleted_at      timestamp nullable
```

### `task_delegations`
```
id              text PK
task_id         text FK → tasks.id
household_id    text FK → households.id
from_user_id    text FK → users.id
to_user_id      text FK → users.id
status          text NOT NULL ('pending' | 'accepted' | 'declined')
created_at      timestamp
responded_at    timestamp nullable
```

Only one pending delegation per task at a time (enforced by checking for existing pending row before insert).

---

## Page Layout

**Route:** `/tasks`

```
[ Quick capture bar — always visible at top ]
[ Tab row: All Tasks | Today (N) | Project pills... | + Project ]
[ Delegation inbox banner — shown when pending requests exist ]
─────────────────────────────────────────────────────────────────
[ Overdue section (red header + count badge) ]
  Task rows with subtasks nested
[ Due today section (pink header + count badge) ]
[ Upcoming ]
[ No due date ]
[ Completed — collapsed by default ]
```

**Quick capture bar:** `h-11` slab input with pink border-bottom accent, magnifier icon (pink), hint text cycles through NLP examples ("Add a task... 'dentist fri 3pm high' or just a name"). Enter or `↵` button submits.

**Tab pills:** horizontal scroll row, `overflow-x-auto scrollbar-none`. Active pill: pink bg, white text. Project pills show project color dot. `+ Project` pill opens inline creation (no sheet).

**Delegation banner:** pink-tinted slab card with caller name, task name, Accept (pink slab) and Decline (light pink) buttons. Hidden when no pending delegations.

**Task rows:** slab card (`SlabCard`), pink border-bottom. Completion circle: unfilled = pink at 40%, filled = pink solid. Footer row shows: avatar + "Name · N comment(s)" on left, Delegate + Edit buttons on right.

**Subtasks:** indented 30px under parent, smaller checkbox (14px square, 4px radius), 12px/600 text. "Add subtask" inline link at bottom of subtask list.

---

## Quick Capture NLP

Client-side utility `parseTaskInput(raw: string): ParsedTask` in `src/lib/utils/parseTaskInput.ts`.

Parse order (each match is stripped from the string before the next step):

1. **Priority** — trailing word match: `high` → `'high'`, `med`/`medium` → `'medium'`, `low` → `'low'`
2. **Time** — `3pm`, `3:30pm`, `15:00`, `15:30` → `"HH:MM"` string
3. **Date** — `today`, `tomorrow`, `mon`–`sun` (next occurrence), `jan 5`, `5/15` → ISO date string using date-fns
4. **Remainder** — trimmed string becomes `title`

Unrecognized tokens stay in the title. The parser never fails — worst case, the whole input becomes the title. After submit, a brief highlight on the populated fields (due date chip, priority badge) confirms what was parsed.

---

## Key Flows

### Delegation

1. User taps **Delegate** in task footer
2. `DelegationSheet` opens — member picker (avatar grid, excludes self and current assignee)
3. User selects recipient → `POST /api/tasks/[id]/delegate { toUserId }`
4. API creates `task_delegations` row (`status: 'pending'`); `task.assigned_to` unchanged
5. Recipient opens Tasks — delegation inbox banner appears
6. Recipient taps **Accept** → `PATCH /api/tasks/delegations/[id]/respond { status: 'accepted' }`
   - `task.assigned_to = toUserId`
   - Banner disappears for recipient
   - Original user's task moves out of their "Mine" filter
7. Recipient taps **Decline** → `status: 'declined'`
   - Task stays with original assignee
   - Toast to original user: "Sarah declined — task is still yours"

One pending delegation per task. Creating a new delegation when one exists replaces it (old row marked declined automatically).

### Project Creation

1. Tap `+ Project` pill in tab row
2. Pill row transforms: text input appears inline where the `+ Project` pill was, 6 color swatches below
3. Type name → pick color → Enter → project saved, tab switches to new project automatically
4. No sheet, no modal — full flow in the pill row, under 5 seconds

### Recurring Task Completion

Same pattern as calendar: expand-on-fetch. Completing a recurring task instance advances `next_due_date` on the template. The completed instance disappears from the list; the next instance appears at the new due date. No child rows stored.

---

## Components

| Component | Description |
|-----------|-------------|
| `TaskQuickCapture` | Quick capture bar, NLP parser, Enter submit |
| `TaskTabRow` | Horizontal pill tabs: All / Today / Projects / + Project |
| `ProjectCreateInline` | Inline project creation UI within the tab row |
| `DelegationBanner` | Inbox banner for pending delegation requests |
| `TaskSection` | Collapsible section with header, count badge, task list |
| `TaskRow` | Slab card: completion circle, title, due chip, priority badge, assignee avatar |
| `SubtaskList` | Indented subtask rows + "Add subtask" link |
| `TaskFooter` | Comment count + Delegate + Edit buttons |
| `TaskSheet` | Full create/edit sheet: all fields including project, subtasks, recurrence |
| `DelegationSheet` | Member picker for delegating a task |
| `TaskCommentSheet` | View + add comments on a task |
| `ProjectSettingsSheet` | Rename, recolor, archive a project |

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tasks` | All household tasks with subtasks, comments count, pending delegations |
| POST | `/api/tasks` | Create task (NLP fields pre-parsed client-side) |
| PATCH | `/api/tasks/[id]` | Edit task, complete/uncheck, advance recurring |
| DELETE | `/api/tasks/[id]` | Soft delete (creator or admin) |
| GET | `/api/tasks/projects` | All projects for household |
| POST | `/api/tasks/projects` | Create project |
| PATCH | `/api/tasks/projects/[id]` | Rename, recolor, archive |
| DELETE | `/api/tasks/projects/[id]` | Soft delete (moves tasks to no-project) |
| POST | `/api/tasks/[id]/delegate` | Create delegation request |
| PATCH | `/api/tasks/delegations/[id]/respond` | Accept or decline delegation |
| GET | `/api/tasks/[id]/comments` | Fetch comments for a task |
| POST | `/api/tasks/[id]/comments` | Add comment |
| DELETE | `/api/tasks/comments/[id]` | Soft delete comment (author or admin) |

---

## Permissions

- **Children:** can complete tasks assigned to them; cannot create, edit, delete, or delegate
- **Members:** full CRUD on own tasks; can complete any task; can delegate and accept/decline
- **Admin:** full CRUD on all tasks
- **Free tier limit:** 10 tasks total (`FREE_TIER_LIMITS.tasks`); gate triggers on POST with `TASKS_LIMIT` error code
- **Projects:** no premium gate — projects are free (they're just named filters)
- **Recurring tasks:** premium only (`RECURRING_TASKS_PREMIUM` error code), Lock icon on recurrence toggle
- **Comments:** free, no limit

---

## Empty States

- **No tasks (all filter):** "Nothing to do." / "Either you are incredibly productive, or you just found this screen. Either way, good job." / button "Add a task"
- **No tasks (project filter):** "All clear in [Project Name]." / "Nothing assigned to this project yet." / button "Add a task"
- **No tasks (Today filter):** "Wide open today." / "Nothing due. Enjoy it." (no button)

---

## Free Tier Limits

| Limit | Value |
|-------|-------|
| Total tasks | 10 |
| Projects | 3 (new limit) |
| Recurring tasks | Premium only |
| Comments | Unlimited (free) |
| Subtasks | Unlimited (free) |
| Delegation | Free |

---

## What This Is Not

- No Kanban board — list only in v1
- No task dependencies ("blocked by")
- No time tracking
- No file attachments
- No public task sharing outside the household
