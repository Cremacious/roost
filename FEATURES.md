# Roost — Feature Registry
> Last updated: 2026-04-13 (Dashboard card grid redesign: tiles now use section-colored 3px slab border-bottom, 44x44 rounded-square icon badges with tinted section backgrounds, a 1px divider between icon and text, and darker icon stroke colors per section. Expenses "Premium feature" subtext renders in green. Grid breakpoint changed from sm: to md:.)
> Previous: 2026-04-13 (Child login bug fixes round 2: removed stray avatar initial on PIN step (blended into background), added visible PIN feedback (white spinner + inline error message), fixed child accounts redirecting to /onboarding by setting onboarding_completed=true in add-child route + onboarding page guard for existing accounts.)
> Previous: 2026-04-13 (Child login bug fixes: PIN keypad no longer snaps back to name picker due to useCallback/useEffect dependency cascade; "Wrong house?" text color fixed to white on red background.)
> Previous: 2026-04-13 (Add Child Account flow: parent now sets a custom 4-digit PIN with show/hide toggle instead of system auto-generating one. API validates pin is exactly 4 digits. Success screen shows personalized note about changing PIN later in Settings.)
> Previous: 2026-04-13 (Settings page: Household name Save button, Upgrade button, Upgrade to Premium button, and Admin role badge all changed from var(--roost-text-primary)/black to #C0160C red. Text kept white. No layout or logic changes.)
> Previous: 2026-04-13 (Mobile top bar restyled to red (#C0160C) matching desktop sidebar. Logo switched to variant="white" on mobile. Weather chip on mobile uses rgba(255,255,255,0.18) bg with white text. Time uses white text on mobile, themed color on desktop. Weather chip and time are split into mobile/desktop variants to allow independent inline styles. No layout or logic changes.)
> Previous: 2026-04-13 (Onboarding page restyled to match auth aesthetic. Background #FFC8C8, card #C41E1E, all text/labels/subheadings updated to white/rgba-white. Option cards white with red-tinted icon boxes. Inputs use rgba-white border and background. RoostLogo gains wordmark={false} prop to render icon-only. No logic, layout, or step flow changes.)
> Previous: 2026-04-13 (Sidebar redesigned to red. Background changed from --roost-sidebar-bg CSS variable to #DC2626 (brand red). All nav item, footer, divider, and sign out button colors updated to white/rgba equivalents for legibility on red. RoostLogo variant="white" used in sidebar so wordmark renders in white. No layout, spacing, or logic changes.)
> Previous: 2026-04-11 (Auth pages redesigned v2. Login and Signup: left panel redesigned with 6 feature highlights (Chores/Groceries/Expenses/Calendar/Meals/Allowances), brand block left-aligned, 28px icon circles at rgba(255,255,255,0.18), labels uppercase 11px. Right panel background #FFF5F5, slab inputs with pink borders (#F5C5C5/#DBADB0). Signup adds static 3-pill step indicator (red tones). Child login: logo + wordmark at top, updated code input sizing, "Let me in" button, "Back to grown-up sign in" link, PIN dots 18px with gap 12px. Mobile breakpoint changed from sm: to md:. All existing form logic, validation, and API routes unchanged.)
> Previous: 2026-04-11 (Rewards management page fully rewritten at /chores/allowances. How-it-works explainer with numbered steps. Per-rule cards show period/reward/threshold badges, progress bar, enable/disable toggle, and edit button. Empty states for no-children and no-rules. Dead allowance files deleted: AllowanceChildCard.tsx, api/allowances/route.ts, api/allowances/child/route.ts, api/allowances/child-progress/route.ts. Chores header button label updated from Allowances to Rewards. premiumGateConfig allowances entry copy updated.)
> Previous: 2026-04-11 (Allowance system reworked into flexible Rewards system. reward_rules + reward_payouts tables replace old allowance tables. Reward types: money/gift/activity/other. Period types: week/month/year/custom. Admin manages from Chores page Rewards section (no longer in MemberSheet). RewardsWidget replaces AllowanceWidget on child dashboard. Cron changed from Sunday-only to nightly. Payout acknowledgement via PATCH /api/rewards/payouts/[id].)
> Previous: 2026-04-11 (Suggestions tab: "Add to bank" button color changed to meals orange. Confirmation dialog added before adding to bank. New status "in_bank" keeps card visible after adding to bank with a BookmarkCheck badge. GET filter now includes both "suggested" and "in_bank". Status semantics: suggested/in_bank/accepted/rejected.)
> Previous: 2026-04-10 (Expenses gating model changed: page is now free for all users. Basic expense add and split bill are free. Premium features gated inline at click-time via PremiumGate sheet: receipt scanning, categories, recurring payments, budget, insights, export. API POST /api/expenses still enforces premium server-side.)
> Previous: 2026-04-10 (Child account system fully operational. add-child route inserts into better-auth "user" table first (FK requirement), then app "users" table. Placeholder email child_${userId}@roost.internal satisfies the NOT NULL unique constraint. Any tooling that creates child accounts must do both inserts in this order.)
> Previous: 2026-04-09 (Settings sidebar active section fixed: replaced IntersectionObserver with scroll-based "closest section above viewport midpoint" approach so Billing and Danger Zone sections always highlight correctly. Email notification toggle removed from Notifications section: chore_reminders_enabled column kept in DB schema but removed from UI and API response; Notifications section now shows info text only. ScrollToTop component added for mobile nav. Mobile Safari UX fixes: all inputs/textareas/selects/contenteditable elements have font-size 16px floor on mobile via globals.css to prevent iOS auto-zoom on focus; viewport maximumScale=1 added to layout.tsx; DraggableSheet adds onOpenAutoFocus preventDefault to stop keyboard popup before user sees form; RichTextEditor hardcodes autofocus: false in useEditor. DraggableSheet now centered on desktop via Tailwind sm: classes; full-width on mobile unaffected. All content bottom sheets migrated to DraggableSheet. Billing page current plan card updated: shows real usage data for free tier (chores/members/grocery lists/reminders with progress bars), premium tier shows Active badge and billing date. Themes made free: no premium gate on theme API or settings picker. Billing page redesigned with hero card, feature grid from PREMIUM_GATE_CONFIG, and bottom CTA. Price $4/month.)
> Use this file for homepage copy, paywall screens, upgrade prompts, and App Store descriptions.

---

## Pricing
- **Free:** Core household features, 1 household, up to 5 members
- **Premium:** $4/month per household — everyone benefits, only admin pays

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
- Adult signup and login (email/password)
- Child PIN login at /child-login: household code entry (cookie-persisted), name picker, 4-digit PIN pad with shake on wrong PIN
- Add child accounts from Settings: admin-only, parent sets a custom 4-digit PIN with show/hide toggle, no email needed
- Create or join household via invite code
- Household invite code sharing
- Member roles: Child, Member, Admin
- Up to 2 child accounts on free (enforced server-side via CHILDREN_LIMIT)
- Welcome modal on first dashboard visit (has_seen_welcome flag, dismissed via POST /api/user/dismiss-welcome)

#### Meals (Free)
- Weekly meal planner (Mon-Sun, 4 slots per day)
- Meal bank — save up to 5 household meals
- Add meal ingredients to grocery list in one tap
- Meal suggestions — any member (including kids) can suggest a meal
- Household voting on suggestions
- Suggested meals now include a target day + slot, ingredients, and optional notes
- Admins can add a suggestion to the meal bank (card stays visible, badge shown) or place it on a day or reject it
- "Add to bank" shows a confirmation dialog before saving; button is disabled with a badge once already in bank

#### Expenses (Free)
- View the expenses page and expense list
- Add an expense (amount, note, payer, split)
- Split bills equally, by amount, or just-me
- Debt tracking: see who owes what at a glance
- Two-sided settlement confirmation

#### Settings
- Profile management (name, email, avatar color)
- Theme selection (8 themes — non-default locked for free)
- Temperature units, language, timezone
- Weather location
- Household name management
- Invite code regeneration

---

### 💎 BUILT — Premium Features ($4/month)

#### Expenses (Premium features)
**Sell it as:** "Unlock the full picture."
**Gate model:** Page is free (view, add, split). Premium features gated inline at click-time (April 2026).
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

#### Rewards (Premium)
**Sell it as:** "Motivate kids with rewards they actually want."
- Admin creates reward rules per child from the Chores page (Rewards section)
- Reward types: Money (auto-creates expense entry in settle-up flow), Gift, Activity, Other
- Flexible periods: Weekly, Monthly, Yearly, or custom N-day cycles
- Threshold: admin sets the completion % required (50-100%) to earn the reward
- Nightly cron evaluates completed periods and creates payout records automatically
- Earned money rewards appear in the expenses settle-up flow automatically
- Child sees RewardsWidget on dashboard: unacknowledged claims they can tap to acknowledge, active rule progress bars, recent payout history
- Admin sees per-rule progress bars in the Rewards section on the Chores page
- Admins can have multiple rules per child (different period types or reward types)

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
**Body:** "Everything your household needs in one app — bill splitting, receipt scanning, budgets, recurring expenses, chore tracking, and more. $4/month per household. Everyone benefits."

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

Free to start. Premium at $4/month per household.
