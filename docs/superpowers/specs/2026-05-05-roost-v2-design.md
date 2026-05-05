# Roost V2 — Product Design Spec

**Date:** 2026-05-05
**Status:** Approved
**Context:** Brainstormed from scratch against the existing `.planning/` V2 roadmap. This spec captures design decisions and product refinements that augment (not replace) the technical planning documents in `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, and `.planning/STATE.md`.

---

## 1. Design Direction

**Decision:** Refined V1.

The V1 red/white identity is correct and stays. The red header/sidebar, slab card borders (bottom border only for 3D effect), and bold tile grid are all preserved. What changes is execution quality:

- Tighter spacing and padding throughout
- Stronger typographic hierarchy (Nunito 800/900 for headings, 600/700 for body — never below 600)
- Snappier Framer Motion animations (page enter, list stagger, completion feedback)
- More polished component states (loading skeletons, empty states, error states)
- Completion interactions feel satisfying — checkbox fill, haptic-style press, streak milestone moments
- The gap from "proof of concept" to "professional indie app" is closed entirely

What does NOT change: the brand red (#EF4444), slab border pattern, Nunito font, Lucide icons, no-emoji rule.

---

## 2. Slogan

Two finalists — decision deferred to copywriting phase before homepage build:

- **"Home, sorted."** — warm, clean, implies effortless order
- **"One App. No Excuses."** — direct, confident, slightly confrontational in a good way

Both work with the visual identity. Choose based on homepage tone once feature showcase copy is drafted.

---

## 3. Navigation

**Confirmed (from existing roadmap):** 5-tab model on all platforms.

| Tab | Contains |
|-----|----------|
| Today | Priority dashboard, chores due, reminders, grocery preview, meals, activity |
| Household | Chores, Tasks, Calendar |
| Food | Grocery + Meals (collocated) |
| Money | Expenses, Splitting, Settle-up |
| More | Notes, Reminders, Stats, Settings, Profile |

Maximum 5 top-level tabs — no feature gets its own tab without explicit product decision.

---

## 4. Today Tab Layout

**Decision:** Priority Stack with section labels.

### Layout
The Today tab answers one question: "What needs my attention right now?"

- **Hero slot (top):** The single most urgent item gets the largest card. Priority order: overdue items first, then due today, then active reminders. Shows first 2–3 items with a "+N more" overflow.
- **Section labels:** Small colored uppercase labels (e.g., "CHORES", "FOOD", "MONEY") separate each group. Color matches the section's brand color.
- **Secondary tiles:** Smaller slab cards below the hero — grocery item count, tonight's meal, money balance, upcoming calendar event.
- **Ad banner:** Fixed at the bottom of the scroll for free users. Never inline with content. Absent for premium users, and absent on onboarding, billing, and critical flows.

### Today tab data sources
| Card | Data |
|------|------|
| Chores due today | Chores where next_due_at <= end of today |
| Active reminders | next_remind_at <= now, not snoozed |
| Grocery | Item count from active list |
| Tonight's meal | meal_plan_slots for today dinner slot |
| Money | Net balance (owed/owing) |
| Calendar | Next event in the next 48h |

---

## 5. Homepage Structure

**Decision:** Story-first.

Leads with emotion, earns trust before asking for money. Optimized for cold traffic who have never heard of Roost.

### Section order
1. **Nav** — logo, sign in, Get Started CTA
2. **Hero** — logo + slogan + 2 CTAs (Get Started / See how it works) + small trust note ("Free to use. No credit card.")
3. **Problem** — "Your household is running on 4 different apps." Splitwise for money, Cozi for calendar, a notes app for grocery, and text messages for everything else. Roost replaces all of them.
4. **Feature showcase** — 6–8 alternating feature rows with real app mockup screenshots (added after V2 is built). Features: Chores + Rewards, Grocery + Smart Sort, Meal Planner, Expense Splitting + Receipt Scanning, Calendar, Tasks + Reminders.
5. **Comparison table** — Roost vs Splitwise vs Cozi vs OurHome. ~12 rows covering the key differentiators.
6. **Personas** — 3 cards: Families (chores + rewards + meals), Roommates (expenses + grocery + bills), College (splitting + tasks + shared calendar).
7. **Pricing + solo-dev story** — Free tier and premium tier side by side. The solo-dev angle: "I'm a solo developer. I sadly have to show ads to keep this free — but premium is my thank-you to the people who support me. No ads, plus some extra features I think you'll love."
8. **FAQ** — Answers the top objections before they kill the signup (see FAQ section below).
9. **Final CTA** — One big button. "Get started free."
10. **Footer** — Links, social, privacy, terms.

### FAQ topics (minimum)
- Is Roost really free?
- Does it work on iPhone and Android?
- How do child accounts work?
- Can I use it with roommates (not just family)?
- Is my data private?
- What happens if I cancel premium?
- How does bill splitting work?
- Can I import from other apps?

### Homepage design rules
- No em dashes, no bullet lists in hero or problem section
- Real app screenshots only (no wireframes or stock imagery)
- Solo-dev story section uses a personal tone — first person, honest, not corporate
- Comparison table: Roost column always leftmost, checkmarks in brand red

---

## 6. Chore System — Gamification

**Decision:** Streak Calendar + Rewards Integrated (C) + Nudge feature (from B).

### Streak Calendar
- 7-day dot strip displayed prominently on the chores page (Mon–Sun of current week)
- Each dot: filled red circle = all assigned chores completed that day, hollow red ring = today (current), gray = incomplete past day, light gray = future
- Streak count displayed as a number with "day streak" label — resets if a day is missed
- Satisfying fill animation when the day's final chore is completed (dot fills in with a small burst)

### Reward Progress Bar
- Displayed directly on the chores page (not buried in a widget or separate screen)
- Shows the child's active reward rule: name, reward description, progress (e.g. "5 of 7 days — $5 allowance")
- Purple section color to differentiate from red chores color
- Visible to the child when they view chores — the motivational loop is immediate

### Leaderboard
- Kept as a secondary surface (tap to open, not always visible)
- Weekly reset, shows points per member with rank badges
- Points shown inline on each chore row (+10 pts) so the connection between action and score is clear

### Nudge
- Admin/parent can tap any member shown at zero completions for the day
- Sends a push notification: "[Your name] gave you a nudge — time to do your chores!"
- Rate limited: once per member per day
- Web: nudge sends an in-app notification banner, no push

### Completion feel
- Checking a chore: circle fills with red, gentle press animation, "+10 pts" label fades in and up
- Completing the last chore of the day: dot fills in the streak calendar with a small animation
- Completing the reward threshold: confetti burst, "You earned it!" modal with the reward details

---

## 7. Meal Planner

**Decision:** Compete on three pain points, sequenced by priority.

### Priority 1 — Grocery integration (ship first)
- One tap to push all meal ingredients to the active grocery list
- Confirmation shows ingredient preview before adding
- Duplicate detection: if an ingredient is already on the list, skip or merge
- Works from meal bank, planner slots, and suggested meals

### Priority 2 — Recipe URL import (ship second)
- Paste any recipe URL → app scrapes title, ingredients, servings, prep time
- User can edit before saving to meal bank
- Fallback: manual entry if scrape fails
- Supported sources: any valid URL (best-effort scrape, no API dependency)

### Priority 3 — Quick rotation picks (ship third)
- "Rotation" tag on any saved meal — marks it as a household staple
- Weekly planner has a "From our rotation" quick-add strip
- System surfaces most-frequently-planned meals first (simple frequency count, no ML)
- Goal: planning a full week takes under 2 minutes for households with established routines

---

## 8. Monetization

### Tier structure
| | Free | Premium ($5/month) |
|--|------|-------------------|
| All core features | Yes | Yes |
| Banner ads (mobile) | Yes | No |
| Receipt scanning | 75 scans/month (shared household cap, hidden unless hit) | Unlimited |
| Bonus features | No | Yes (chore history, stats, multiple grocery lists, custom categories, rich notes, recurring expenses, export) |

### Receipt scanning cap behavior
- Cap is 75 scans/month per household
- Counter is never shown to users unless they hit the limit
- On hitting the limit: "You've used all your receipt scans this month. Scans reset on [date]. Upgrade to premium for unlimited scans."
- Rationale: most households scan fewer than 10 receipts/month — the cap is a safety valve, not a meaningful restriction for normal users

### Solo-dev pricing angle
Tone: honest, sympathetic, first-person. Not marketing copy — sounds like a real person.
- On the homepage pricing section
- On the premium upgrade screen in-app
- On the billing settings page

Key message: "Ads keep Roost free for everyone. Premium removes them and unlocks some extra features — it's my way of saying thank you to the people who support the app."

### Intro deal
- Limited-time launch discount for early users (exact amount and duration TBD at launch)
- Applied via promo code at signup or on the billing page
- Communicated in launch marketing and App Store description

### Referral system
- Each account can earn up to 3 referral rewards (6 months free total)
- Reward trigger: the invited user must become a paying premium member (not just sign up)
- Referrer earns: 2 free months of premium per qualifying referral
- Referred user earns: the current intro deal discount (same as a new user)
- Referral link includes the referrer's ID, tracked server-side
- Referral status visible in Settings: "You've referred X paying members. X free months earned."

---

## 9. Child Account Onboarding

### The problem with V1
Child account setup was buried and unexplained. Parents didn't know what a child account was, how PIN login worked, or what their child could/couldn't do.

### V2 approach
**Onboarding flow** (after creating household):
1. "Add your household members" step — shows options: Invite an adult, Add a child account
2. "What's a child account?" explainer inline — no taps required to see it: "Child accounts use a simple PIN instead of a password. Kids can see chores, grocery lists, and their rewards — but can't see expenses or financial info."
3. Admin sets child's name and a 4-digit PIN in one screen
4. Child login explained: "They sign in at [your household code] + their PIN from any device"
5. First-run: child sees a welcome screen explaining their view

**Settings access:**
- Household Settings → Members → Add Child — reachable in 2 taps from anywhere in the app
- Child account card in members list shows PIN status and last active

---

## 10. Admin Controls

### Design principle
A non-technical parent should be able to lock or unlock any feature for any member in under 10 seconds.

### Permission panel
- Per-user permission panel accessible by tapping any member in the Members list
- Top section: role badge (Admin / Member / Guest / Child) with role description
- Master toggles per feature category: Expenses, Grocery, Chores, Calendar, Tasks, Notes, Meals, Reminders
- Each master toggle has an expand arrow for per-action granularity (e.g. Grocery: view / add / manage lists)
- Changes apply immediately server-side
- Child accounts: financial toggles are always locked off (grayed out, lock icon, tooltip explains why)

### Quick lock
- Long-press a member's avatar (or 3-dot menu) → "Restrict [Name]" → single confirmation → turns off: expenses, notes, stats, reminders, meal planning, recurring items. Leaves on: grocery view, chore view, calendar view (read-only basics).
- Useful for temporary situations (guest, teenager grounded, etc.)

---

## 11. Platform Notes

### Web
- Desktop: sidebar nav (220px) + full content area, scales to window size
- Web mobile: bottom tab bar mirroring the native app's 5-tab structure
- No push notifications on web — in-app banners only
- No banner ads on web — Stripe is the web monetization path
- Stripe for web payments; RevenueCat for iOS/Android IAP

### Mobile (Expo)
- iOS first, Android 4–6 weeks after
- AdMob banner ads in the free tier (bottom of screen, never over content)
- RevenueCat handles all IAP — `appUserId` = `householdId` (per-household pricing)
- Push notifications via Expo Push — deferred past onboarding, requested at first natural moment (after first chore completion or first reminder added)
- App Tracking Transparency prompt before AdMob initializes
- COPPA: non-personalized ads flag for child accounts

---

## 12. Relationship to Existing Planning Docs

This spec supplements — it does not replace — the existing planning documents:

| Document | What it covers |
|----------|---------------|
| `.planning/ROADMAP.md` | 5-phase build sequence and success criteria |
| `.planning/REQUIREMENTS.md` | 139 individual requirements with IDs |
| `.planning/STATE.md` | Current phase status and decisions log |
| `.planning/phases/` | Detailed execution plans for Phase 0 |
| **This spec** | Design decisions, UX direction, product refinements |

When requirements in `.planning/REQUIREMENTS.md` conflict with decisions in this spec, this spec takes precedence (it reflects later, more detailed decisions).

---

## Open Questions

| Question | Impact | Owner |
|----------|--------|-------|
| Slogan: "Home, sorted." vs "One App. No Excuses." | Homepage hero + App Store description | Decide before Phase 4 homepage build |
| Intro deal: exact discount % and duration | Billing page + launch marketing | Decide before Phase 3 billing UI |
| Recipe URL scraping: build custom or use a library? | Phase 2 meal planner implementation | Research in Phase 2 |
| App Store name: search "Roost" for conflicts | Blocks App Store submission | Check before Phase 3 |
| 7-day free trial: include or not? | RevenueCat config in Phase 3 | Decide before Phase 3 |
| COPPA: adult-first App Store positioning confirmed? | Impacts AdMob usage | Confirm before Phase 3 |
