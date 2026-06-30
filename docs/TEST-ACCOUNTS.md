# Roost QA Test Accounts

Seeded by `npm run db:seed` (`src/db/seed.ts`). Idempotent and safe to re-run —
account/household rows are reused and each content block only seeds when empty,
so re-running never duplicates data.

This data exists to make the GitHub QA checklists (issues #24–#43, #62) and the
functional bugs (#53–#60) testable by hand without building everything through
the UI first.

**All email/password accounts use password: `RoostTest123!`**

---

## Roost Premium House — `PREMHS` (premium)  ← main QA playground

| Login | Name | Role |
|---|---|---|
| `admin.premium@roost.test` | Premium Admin | admin |
| `jordan@roost.test` | Jordan Lee | member |
| `taylor@roost.test` | Taylor Kim | member |
| `riley.guest@roost.test` | Riley Guest | guest (expires in 14 days) |
| child login → code `PREMHS`, PIN `5678` | Premium Kid | child |

Seeded content:
- **Chores** (6): assigned to specific members (Jordan, Taylor, Admin, the kid) plus one unassigned. Mix of overdue / due-today / upcoming. 7 completions across this + last week → leaderboard, streaks, history, stats.
- **Money**: 3 expenses with real outstanding balances —
  - Costco run $120 (Admin paid) → Jordan owes $40, Taylor owes $40
  - Electric bill $90 (Jordan paid) → Admin owes $30, Taylor owes $30
  - Dinner out $54 (Taylor paid) → Admin's $27 share is **mid-settlement** (claimed, awaiting confirm) so the pending-confirmation flow is testable.
  - Plus: a Groceries budget ($300), a "Summer vacation" savings goal ($1000 target, 2 contributions), and 2 recurring templates (Netflix $15.49/mo, Rent $1800/mo as a bill).
- **Calendar** (4): an upcoming "Family dinner" (tomorrow, for the Today Next-Event card), a dentist appt, an RSVP-enabled "House meeting" (today, with attendees), and a weekly recurring "Trash day".
- **Grocery**: default "Shopping List" (5 items, one checked) + a second "Costco Run" list (multi-list is premium).
- **Tasks** (5): overdue/high, due-soon, no-date, completed, plus a "Home reno" project, a subtask, a comment, and a pending delegation (Jordan → Taylor).
- **Notes** (2): one plain, one rich-text (HTML).
- **Reminders** (3): a **due-now** household reminder (drives the ReminderBanner), a recurring weekly self reminder, and a specific-member one-time reminder.
- **Meals**: 4 in the bank, planner slots for tonight's dinner + tomorrow's breakfast, and a suggestion with 2 upvotes.
- **Rewards**: a weekly "$5 allowance" rule for Premium Kid + an unacknowledged earned payout (so the kid sees a Claim card).
- ~12 activity-feed rows.

## Roost Free House — `FREEHS` (free)  ← free-tier limit testing

| Login | Name | Role |
|---|---|---|
| `admin.free@roost.test` | Free Admin | admin |
| `member@roost.test` | Test Member | member |
| child login → code `FREEHS`, PIN `1234` | Test Child | child |

Light content deliberately kept **under** free-tier limits (3 chores, 1 grocery
list, 2 tasks, 1 note, 1 reminder, 2 meals) so you can hit the limits yourself
when testing premium gates. Already at the free child limit (1 child).

## Roost Second House — `SECND2` (premium)  ← multi-household switcher

`admin.premium@roost.test` is also an admin here, so that account belongs to two
households. Use it to test the multi-household switcher and query/UI invalidation
(#35, #43). Minimal content on purpose.

---

## Promo codes (Settings → Promotions, and Admin panel)

| Code | State |
|---|---|
| `ROOSTFREE30` | active, 30 days |
| `ROOSTLIFE` | active, lifetime |
| `PAUSEDCODE` | paused |
| `DEADCODE` | deactivated |
| `MAXEDOUT` | active but max redemptions reached |
| `EXPIREDPROMO` | active but past its expiry date |

Covers valid / invalid / duplicate / paused / deactivated / exhausted / expired
redemption paths (#36, #37, #38).

---

## Admin panel

The admin panel (`/admin`) uses separate credentials from the env vars
`ADMIN_EMAIL` / `ADMIN_PASSWORD` (not the accounts above). Use the
"hide test accounts" toggle to filter out the `@roost.test` seed accounts.
