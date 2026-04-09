# Roost — Feature Registry
> Last updated: 2026-04-09 (Chores page: moved + button from fixed FAB to header top-right; History/Leaderboard collapse to icon-only on mobile; Grocery page: animated scroll progress indicator on list pill row replaces native scrollbar; Tasks page: per-section client-side pagination via usePaginatedList hook + ShowMoreButton component; Expenses page: tab active state uses green COLOR; balance stat cards fixed to consistent height with justify-between label/value layout)
> Use this file for homepage copy, paywall screens, upgrade prompts, and App Store descriptions.

---

## Pricing
- **Free:** Core household features, 1 household, up to 5 members
- **Premium:** $3.99/month per household — everyone benefits, only admin pays

---

## Feature List

### ✅ BUILT — Free Features

#### Chores
- Create and assign chores to household members
- Mark chores complete
- View chores assigned to you vs all household chores
- Basic chore list management

#### Grocery
- Shared grocery list visible to all members
- Optimistic check/uncheck (instant feedback)
- Add, edit, remove items
- Smart Sort: auto-groups unchecked items by store section (produce, dairy, frozen, etc.)
  - 16 store sections, keyword-based classifier, pure client-side
  - Toggle persisted per-list in localStorage
  - Free for all users, no premium gate

#### Calendar
- Shared household calendar
- Create and view events
- Basic event management

#### Tasks
- Create and assign tasks with due dates
- Priority levels
- Mark complete

#### Notes
- Create and view household notes
- Plain text

#### Reminders
- Set one-time reminders
- Notify just yourself

#### Auth & Household
- Adult signup and login
- Child PIN login
- Create or join household via invite code
- Household invite code sharing
- Member roles: Child, Member, Admin
- Up to 1 child account on free (enforced server-side via CHILDREN_LIMIT)

#### Meals (Free)
- Weekly meal planner (Mon-Sun, 4 slots per day)
- Meal bank — save up to 5 household meals
- Add meal ingredients to grocery list in one tap
- Meal suggestions — any member (including kids) can suggest a meal
- Household voting on suggestions

#### Settings
- Profile management (name, email, avatar color)
- Theme selection (8 themes — non-default locked for free)
- Temperature units, language, timezone
- Weather location
- Household name management
- Invite code regeneration

---

### 💎 BUILT — Premium Features ($3.99/month)

#### Expenses & Bill Splitting
**Sell it as:** "No more awkward money talks."
- Add expenses manually with title, amount, category, notes
- Split bills equally, by amount, or by percentage
- Debt simplification — automatically reduces "A owes B, B owes C" to "A owes C"
- See who owes what at a glance
- Two-sided settlement confirmation — both parties must confirm before marked settled
- Dispute settlements if payment wasn't received
- Send reminders to confirm pending payments
- Settle all debts between two members in one tap
- Expense categories with custom icons and colors
- Custom household categories (admin creates, members suggest)
- Receipt scanning with Azure Document Intelligence (any receipt format)
  - Walmart, grocery stores, restaurants, specialty stores all supported
  - Item-level splitting — assign individual items to specific people
  - Automatic total, tax, and subtotal extraction
- Export expenses as CSV or PDF
  - Filter by date range
  - Professional PDF format suitable for move-out disputes
- Recurring expenses (rent, utilities, subscriptions)
  - Weekly, biweekly, monthly, yearly
  - Admin reviews and confirms before posting each cycle
  - Adjustable amount per cycle (for variable bills like utilities)
  - Pause and resume templates
- Spending insights dashboard (/expenses/insights)
  - Spending by category (donut chart)
  - Spending over time (line chart)
  - Spending by member (bar chart)
  - Summary stats: total spent, biggest category, avg per member
  - Custom date range filtering
- Budget tracking (/expenses/budget)
  - Set monthly budgets per category
  - Visual progress bars with color coding
  - Custom warning threshold per budget (50-95%)
  - Auto-reset monthly or manual reset
  - Push + in-app notifications when approaching or exceeding budget
  - Over-budget banner on expenses page

#### Household Stats (/stats)
**Sell it as:** "See how your household is doing."
- Date range presets: 7 days, 30 days, 90 days, full year, or custom
- 6 stat cards: chores done, total spent, tasks completed, meals planned, grocery items, most active member
- Chore activity chart (area chart, daily completions over time)
- Spending over time (area chart, weekly buckets)
- Spending by category (donut chart with legend)
- Chores by member (horizontal bar chart, color coded)
- Activity breakdown by module (horizontal bar chart)
- Task priority breakdown (donut chart)
- Member overview table: chore completions + points per member
- Household info footer: age in days, member count, oldest member

#### Chores (Premium)
- Recurring chores (daily, weekly, monthly, custom days)
- Chore streaks — consecutive day tracking
- Leaderboard — household ranking by points
- Completion history (/chores/history)
  - Full log of every chore completed by anyone in the household
  - Filter by member and date range
  - Stats: total completions, most active member, streak leader
- Custom chore categories with icons and colors
  - 8 seeded defaults: Kitchen, Bathroom, Bedroom, Outdoor, Laundry, Pet Care, Errands, Other
  - Admins create custom categories inline in the chore form
  - Members can suggest categories (admin approves or rejects)
  - Category filter pills on the chores list page
  - Category badge on each chore row
  - Admin management in Settings > Chore Categories
  - Premium gate: CHORE_CATEGORIES_PREMIUM error code

#### Grocery (Premium)
- Multiple named grocery lists (Costco run, Target, weekly shop, etc.)

#### Calendar (Premium)
- Recurring events (daily, weekly, biweekly, monthly, yearly)
  - End conditions: never, on a specific date, or after N occurrences
  - Expand-on-fetch architecture — no cron, no child rows
  - Edit or delete always affects all occurrences
  - Repeat icon shown on event pills, mobile day list, agenda, and DaySheet
  - Premium gate: RECURRING_EVENTS_PREMIUM error code

#### Reminders (Premium)
- Recurring reminders (daily, weekly, monthly)
- More than 5 active reminders
- Notify whole household or specific members

#### Household (Premium)
- Unlimited child accounts (free: 1 child account, enforced server-side)
- Unlimited household members (free: 5 members)

#### Themes (Premium)
- Unlock all 8 app themes beyond Default and Midnight

#### Meals (Premium)
**Sell it as:** "Your household's recipe box, unlimited."
- Unlimited meal bank (free tier: 5 meal limit)
- Smart meal suggestions based on your meal bank

#### Allowances (Premium)
- Set weekly allowances for child accounts (UI gated in MemberSheet)
- Tied to chore completion percentage
- Adjustable threshold (50-100%)
- Child dashboard widget hidden for free households
- Earned allowances appear in expenses settle-up flow

#### Guest / Temporary Member (Premium)
**Sell it as:** "Invite a temporary member."
- Invite someone via magic link (64-char token, expires in 7 days)
- Guest membership auto-expires on admin-chosen date (1 day to 1 year)
- Guest gets full account but limited role with read/add permissions only
- No access to: chore assignment, note creation, list creation, meal planning
- Admin controls via InviteGuestSheet: optional email, preset or custom expiry
- Guest badge shown in members list with relative expiry ("expires in 3 days")
- Cron job runs daily at 2am UTC to hard-delete expired guest memberships
- Works seamlessly with existing signup/login flow via sessionStorage token relay
- Premium gate: GUEST_MEMBER_PREMIUM error code

#### Notes (Premium)
**Sell it as:** "Notes worth keeping."
- Rich text editor powered by Tiptap (open source, zero cost)
  - Bold, italic, strikethrough
  - Headings (H1, H2, H3)
  - Bullet lists, ordered lists, task lists (interactive checkboxes)
  - Blockquotes, code blocks
  - Links with one-click insert
  - Full undo/redo history
- Task checkboxes auto-save in view mode (500ms debounce)
- Free users see plain textarea unchanged, with upgrade nudge
- NoteCard preview strips HTML tags for clean card display
- "Rich" badge shown on HTML notes in the card grid
- Content limit raised to 50,000 characters for rich content
- Premium gate: RICH_TEXT_NOTES_PREMIUM error code

---

### 🔜 PLANNED — Not Yet Built

#### Near-term (web, before iOS launch)

**Premium Themes**
Unlock 6 additional app themes beyond Default and Midnight: Forest, Slate, Sand, Ocean, Rose, Carbon. CSS-only, zero operating cost.
Premium feature.

~~**Household Stats Page**~~ — BUILT (see above)

~~**Rich Text Notes**~~ — BUILT (see above)

~~**Guest / Temporary Member**~~ — BUILT (see above)

~~**Grocery Smart Sort**~~ — BUILT (see above)

~~**Custom Chore Categories and Icons**~~ — BUILT (see above)

~~**Admin Panel**~~ — BUILT (see Internal Tools below)

#### Platform (after web launch)
- iOS app via Expo
- Android app via Expo
- Ambient tablet mode

---

### Internal Tools (not user-facing)

#### Admin Panel (/admin)
Protected by ADMIN_EMAIL + ADMIN_PASSWORD env vars. Own JWT session cookie (8 hours). Completely separate from better-auth.
- Overview page: 6 stat cards (total users, households, premium, free, active 30d, new this week) + 2 Recharts area charts (signups over time, premium conversions over time)
- Users page: search by name/email, filter All/Premium/Free, paginated table (50/page), expandable rows with User ID + Household ID + Stripe Customer ID (copyable)
- Households page: search, filter, paginated table, expandable rows with all Stripe IDs + member emails, Set Premium / Set Free action buttons with confirmation dialog (optimistic UI update)
- Spanish localization

---

## Paywall Copy Bank
> Ready-to-use copy for upgrade prompts and premium gates.

### Expenses gate
**Title:** "No more awkward money talks."
**Body:** "Track who paid what, split bills fairly, and settle up without the uncomfortable conversations. Scan receipts, split by item, and let Roost handle the math."

### Receipt scanning gate
**Title:** "Scan any receipt. Split in seconds."
**Body:** "Point your camera at any receipt — grocery store, restaurant, Walmart — and Roost reads it automatically. Assign items to specific people and split down to the cent."

### Budget tracking gate
**Title:** "Keep spending on track."
**Body:** "Set monthly budgets per category and get notified before you overspend. See exactly where your household's money is going."

### Spending insights gate
**Title:** "Understand your spending."
**Body:** "Beautiful charts showing where your money goes, how spending changes over time, and who's contributing what. Your household finances, finally visible."

### Recurring expenses gate
**Title:** "Set it and never forget it."
**Body:** "Rent, utilities, subscriptions — set up recurring expenses once and Roost reminds you to post them every cycle. Always know what's coming."

### Chore streaks gate
**Title:** "Turn chores into a game."
**Body:** "Track streaks, earn points, and see who's really pulling their weight. The household leaderboard makes chores surprisingly competitive."

### Chore history gate
**Title:** "See every chore, ever completed."
**Body:** "A full log of your household's chore history. See who's consistent and who needs a nudge."

### Recurring chores gate
**Title:** "Chores that schedule themselves."
**Body:** "Set chores to repeat daily, weekly, or on specific days. No more nagging — Roost keeps the schedule."

### Multiple grocery lists gate
**Title:** "A list for every store."
**Body:** "Costco run, weekly shop, Target trip — keep them separate and share the right list with the right people."

### Themes gate
**Title:** "Make Roost yours."
**Body:** "Unlock all 8 themes and give your household its own look and feel."

### Meal bank limit gate
**Title:** "You've saved 5 meals."
**Body:** "Upgrade to save unlimited meals to your household's recipe box. The more you save, the easier planning gets."

### Smart suggestions gate
**Title:** "Meal ideas, on demand."
**Body:** "Roost can suggest meals based on your household's favorites. Upgrade to unlock smart suggestions."

### Household stats gate
**Title:** "See how your household is doing."
**Body:** "Chore completion rates, spending trends, streak leaders, and activity over time. All the data you've been generating, finally visualized."

### Guest member gate
**Title:** "Invite a temporary member."
**Body:** "Add someone to your household for a set period — perfect for splitting Airbnb costs, hosting family, or short-term roommates. Auto-expires so you never have to remember to remove them."

### Custom categories gate
**Title:** "Organize chores your way."
**Body:** "Create custom categories and icons that match how your household actually works. Your home, your system."

### Rich text notes gate
**Title:** "Notes worth keeping."
**Body:** "Add headings, checklists, bold text, and links to your household notes. Upgrade from a scratchpad to a real knowledge base."

### General premium gate (fallback)
**Title:** "Upgrade to Roost Premium"
**Body:** "Everything your household needs in one app — bill splitting, receipt scanning, budgets, recurring expenses, chore tracking, and more. $3.99/month per household. Everyone benefits."

---

## App Store Description (Draft)

**Tagline:** The household OS for families and roommates.

**Short description:**
Roost brings your whole household together — chores, groceries, expenses, and calendars in one app. Stop using five different apps to manage your home.

**Full description:**
Roost is the all-in-one household management app for families, roommates, and college students. Assign chores, split bills, track expenses, manage groceries, and keep everyone on the same page.

**Split expenses without the awkwardness.**
Scan any receipt with your camera, assign items to the right people, and let Roost calculate who owes what. Two-sided settlement confirmation means everyone agrees before anything is marked paid.

**Chores that actually get done.**
Assign recurring chores, track streaks, and see who's leading the household leaderboard. Kids have their own PIN login and can only see what's appropriate for them.

**Grocery lists everyone can use.**
One shared list, updated in real time. Check items off as you shop — it updates instantly for everyone at home.

**Your household finances, finally clear.**
Set monthly budgets per category, get notified when you're approaching the limit, and see beautiful charts showing exactly where your money goes.

**Designed for real households.**
Whether you're splitting rent with roommates, managing a family of five, or coordinating with college housemates — Roost works for everyone.

Free to start. Premium at $3.99/month per household.
