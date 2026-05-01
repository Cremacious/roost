# Features Research: Roost V2

**Domain:** Household / family management super-app
**Researched:** 2026-05-01
**Confidence:** HIGH (competitor audit), MEDIUM (conversion benchmarks), HIGH (IA patterns)

---

## Competitor Audit

| App | Strengths | Weaknesses | IA Pattern | Revenue Model |
|-----|-----------|------------|------------|--------------|
| **Splitwise** | Best-in-class debt math and simplification. Multi-currency. Fast expense entry. Group trip support. | No household management beyond expenses. 2024 changes: 4 expense/day free limit, unskippable 10s video ads, $5/mo Pro — caused massive user backlash and switching. UI feels dated. | Single purpose: groups list as home, tap group to see balances and log expenses. Flat. | Freemium + ads. Pro ~$5/mo or $40/yr. Aggressively paywalled in 2024. |
| **Cozi** | Dominant in family calendar. Email digest reminders. Simple, reliable. 10+ years of brand trust with families. Shopping lists are solid. | May 2024 update gutted the free calendar to an almost unusable state. Interface is circa 2014. No expense tracking. No chore system. No child accounts. No gamification. | Tab bar: Calendar, Lists, Meals, Journal, To-Do. Dead simple, no nesting. | Freemium + $39/year Gold. Free tier now very restricted. |
| **OurHome** | Chore gamification with points and rewards — strongest in market for this. Task assignment is good. 4.5 stars iOS. | Premium gates core features (rewards, calendar events, custom messages). App quality gap between iOS (4.5) and Android (3.9). Not actively developed with modern UI. No expense tracking. | Tab bar: Tasks, Calendar, Grocery, Messages, Profile. Points widget on home. | Free + Premium (price not disclosed publicly). |
| **FamilyWall** | Family social feed (private family Facebook). Health records tracking. Location sharing. Good cross-platform. | Sync bugs cause event/data loss — catastrophic for a calendar app. Learning curve. Reliability complaints are frequent. Premium at $4.99/mo is hard to justify given bugs. | Bottom nav: Feed, Calendar, Lists, Location, More. Social-first approach. | Freemium. Free tier: calendar + lists only. Premium $4.99/mo or $44.99/yr. |
| **Tody** | Beautiful visual UX. Room-based cleaning schedule with urgency indicators (not arbitrary dates). Mascot gamification. No arbitrary due dates — task urgency grows naturally over time. | Cleaning only — not a household hub. No expenses, no calendar, no grocery. Family/sharing requires premium. Niche, does not solve coordination beyond cleaning. | Home is "Areas" (rooms). Each room has Basic/Special/Custom task tiers. Very focused IA. | Free (basic) + Premium for sync. One-time and subscription options. |
| **Any.do Family** | Strong AI features for task prioritization. Cross-platform (iOS, Android, macOS, Windows, Web, Chrome). Grocery smart-sort by aisle. Good calendar integration. | Family plan is an add-on to a fundamentally personal productivity app. Family coordination feels bolted on, not native. No expense tracking or chore gamification. | Tab bar: Today, Upcoming, Sticky Notes, All. Calendar integrated in same views. | Free + Premium + Family plan. AI features premium-only. |
| **Homey** | Dedicated chore/allowance app. Photo proof of chore completion. Allowance "jars" for kids to save/donate. Amazon affiliate for rewards redemption. | Interface feels 2018. No offline support. $3.99/mo for up to 5 users, $6.99 unlimited. No expenses, no calendar, no grocery. | Family home screen with chore assignments. Kid view vs parent view are distinct screens. | Freemium. Free: 3 users. Premium: $3.99/mo up to 5, $6.99 unlimited. |
| **Goodbudget** | Envelope budgeting executed well. Strong with couples and joint accounts. Bank sync (2024 addition). High App Store rating (4.7 stars, 13k reviews). | Personal finance, not household coordination. No chores, no grocery, no calendar. Free tier: only 20 envelopes, 1 account. $10/mo or $80/yr is expensive. | Home screen is envelope bars. Transactions tab. Reports tab. Accounts tab. | Freemium. Free: 20 envelopes. Premium: $10/mo or $80/yr. |
| **HomeRoutines** | Time-based cleaning reminders. Solid for individuals with routines. Long-established on iOS. | iOS only. Time-based (not urgency-based) feels less smart than Tody. Not a household coordination tool. No sharing, expenses, grocery. | Zones/routines structure. Morning/evening routine bands. Very personal-use focused. | Paid app, no free tier. |

### Key Competitor Insight

The market is fragmented between single-purpose tools (Splitwise for expenses, Cozi for calendar, Tody for cleaning) and shallow all-in-one apps (OurHome, FamilyWall) that lack depth in any one area. **No app combines real expense tracking + chore management + child rewards + shared grocery + shared calendar in a modern, well-designed package.** This gap is exactly where Roost sits.

Splitwise's 2024 self-destruction through aggressive paywalling is the clearest market signal: there is significant displaced user demand for a fair-priced expense-splitting tool that is part of a larger household package. Users who left Splitwise need somewhere to go.

---

## Table Stakes (Must Have or Users Leave)

These are non-negotiable. Missing any one of these causes immediate uninstall or outright rejection from household members.

**1. Real-time shared grocery list with check-off**
The grocery list is the highest daily-use feature in any household app. If it does not sync instantly, users revert to texting. Must support: add from anywhere, check/uncheck by anyone, items group stays visible until cleared. Roost has this.

**2. Shared calendar that works reliably**
FamilyWall's primary failure is calendar sync bugs. Calendar reliability is non-negotiable — one missed event and trust is broken forever. Roost has this, but recurring event UX must be rock-solid.

**3. Frictionless member invitation**
A household app is worthless with one member. If inviting a partner/roommate takes more than 30 seconds, adoption fails. Best practice: shareable link that works without requiring the invitee to already have the app installed. Roost has invite codes and guest links.

**4. Fast first-session value (under 60 seconds to first meaningful action)**
Industry benchmark: 72% of users abandon apps during onboarding if it requires too many steps. Day-1 uninstall rates run 20-25% for mobile apps. First meaningful action must happen in the first session. For Roost, this means: household created, first chore or grocery item added.

**5. Cross-platform availability**
Household members have different phones. An iPhone-only or Android-only app fails immediately in mixed households. Web + iOS + Android is the baseline expectation.

**6. Individual member views (what do I need to do?)**
Users don't want to see the whole household's workload. They want to see their chores, their share of expenses, their calendar events. The personal/household toggle is essential.

**7. Notifications that actually fire**
FamilyWall complaints consistently cite notification failures. If reminders don't work, the app breaks its core promise. Push notifications via Expo are the right call for Roost.

**8. Offline read access for grocery list**
Users are in the store with spotty signal. The grocery list must load from cache. Write can fail gracefully, but the list must be readable offline.

---

## Differentiators (Competitive Advantage)

Features that cause word-of-mouth and retention. These are what make users recommend the app.

**1. Child accounts with rewards/allowance tied to chore completion**
No direct competitor does this in a modern, polished way. Homey does allowance but not household coordination. OurHome does points but not allowance math. The combination of: kid logs in with PIN, sees their chores, earns rewards, parent gets reports — is unique and creates a strong family lock-in effect. Users with kids in the system do not leave.

**2. Receipt scanning with per-person line item splitting**
Splitwise cannot scan receipts. No household app can do per-line-item splitting where you assign individual items to specific people. This is a meaningful differentiator for roommates splitting restaurant bills or grocery trips.

**3. Per-household pricing (not per-user)**
Every competitor prices per person or per family at a flat rate. Roost's per-household model is family-friendly and a strong selling point. "One price covers everyone in the house" is the clearest value proposition in the market.

**4. Meals + grocery integration (ingredients to list)**
No competitor connects meal planning to grocery lists with one tap. This collapses two separate app categories. When a user plans meals for the week and taps "add to grocery list," it creates the kind of satisfying automation that generates word-of-mouth.

**5. Household activity feed (shared context)**
No competitor has a persistent household feed showing who completed what chore, added what expense, or planned what meal. This creates a sense of shared presence that reduces coordination overhead via group chat. It also makes the Admin feel in control without micromanaging.

**6. Chore history and stats (premium)**
Seeing "your household completed 47 chores this month, up 12% from last month" is intrinsically motivating. No competitor provides household-level analytics on chores, expenses, and tasks in a single view.

**7. Ambient tablet mode**
No competitor has thought about the shared household device. A tablet mounted in the kitchen showing today's chores, tonight's dinner, and current weather is a fundamentally different product category moment. This is a premium feature with very high visual appeal in marketing.

---

## Anti-Features (Deliberately Avoid)

**1. Aggressive paywalling of core features mid-session**
Splitwise's 2024 disaster shows exactly what happens: users revolt, leave, and publicly recommend alternatives. Free-tier users who hit walls while trying to enter a basic expense will uninstall. The Roost model (ads on free, premium removes ads + unlocks advanced features) avoids the core-feature-hostage trap.

**2. Unskippable or interstitial ads**
Splitwise introduced unskippable 10-second video ads before expense entry. Users cited this as the primary reason for switching. Banner ads at the bottom of screen are the acceptable format. Nothing should block or interrupt a core user action.

**3. Daily usage limits on core features**
Splitwise's 4-expense-per-day limit for free users is the worst possible monetization design: it punishes the power users who would be most likely to convert. Never rate-limit core feature usage.

**4. Requiring all household members to pay separately**
Any model where each household member must subscribe individually is a household app killer. Household buy-in is already hard. Adding per-person payment makes it impossible.

**5. Over-complicating the home screen**
FamilyWall and OurHome suffer from putting too many features at equal visual weight on the home screen. The home screen should answer one question: "What do I need to do today?" Everything else is one navigation level down.

**6. Calendar sync with external calendars (at launch)**
FamilyWall's primary reliability failures come from Google Calendar and Outlook sync. External calendar sync is technically complex and a major source of bugs. Roost's calendar is self-contained, which is the right call for V2. Do not add external sync until the core calendar is stable.

**7. Social/public features**
FamilyWall's "private family Facebook" is a complexity trap that dilutes the product identity. Roost should remain a private, functional household tool. The activity feed is internal-only.

**8. Requiring email invites (as the only invite path)**
Email invites create friction when a household member doesn't check email or uses a different email address. Invite link + household code (Roost's current model) is better.

---

## IA Patterns That Work

### Pattern 1: 5-tab maximum, grouped by user mental model (not feature list)

Apple's Human Interface Guidelines and every major IA study agree: more than 5 tabs on mobile creates cognitive overload. The current Roost V1 navigation maps 9+ items to a sidebar with equal weight, communicating nothing about what the app is for.

The right grouping maps to how users think about household life:
- **Today** (what do I need to do right now?)
- **Household** (chores, tasks, calendar — the coordination layer)
- **Food** (grocery + meals — both food-related)
- **Money** (expenses — its own mental bucket)
- **More / People** (settings, members, notes, reminders, stats — infrequent access)

This is almost exactly the V2 IA proposed in PROJECT.md, which is validated by how users think.

### Pattern 2: Progressive disclosure (Linear's approach)

Linear's 2024 UI redesign principle: make the sidebar dimmer, let the content area take visual precedence. Apply the same logic to Roost: the nav chrome should recede, the actual household data should fill the screen. Features in the "More" bucket are not hidden — they're one level down, which signals to users that these are configuration-level items, not daily-use items.

Things 3's sidebar philosophy: "Everything has its place, nothing feels superfluous." Applied to Roost: each nav item should represent a daily or near-daily use case. Notes and reminders belong in a secondary level because most users interact with them less than once per day.

### Pattern 3: Context-aware home screen (Tody's urgency model applied broadly)

Tody's insight: don't show everything, show what matters right now. A chore is shown when it needs attention. Applied to Roost's home screen: the Today view should surface only what's actionable today — chores due, expenses pending, events today, grocery items added recently. The home screen is not a dashboard of all features; it's a living feed of what needs attention.

### Pattern 4: Feature-specific color as navigation signal (Apple's own apps)

Apple Reminders, Calendar, and Files each use color as a section identifier, not a decorative choice. Roost's section colors (red for chores, amber for grocery, blue for calendar, green for expenses) already follow this pattern. In V2, the color should be the signal — users learn "amber = grocery" faster than they learn tab labels. Consistent application of section color on all states of that feature (badges, buttons, empty states) reinforces this mental model.

### Pattern 5: Sheet-first interactions for creation flows

Bottom sheets for creating and editing items (vs. full-screen push navigation) are faster on mobile, feel more native on iOS, and keep users oriented (they can see context behind the sheet). Roost's DraggableSheet pattern is validated and should be maintained in V2. Do not replace with full-screen push navigation for item creation.

### Pattern 6: Quick add as the primary entry point

The grocery quick-add bar is the right pattern for the highest-frequency action. Every feature that has a "create new item" as its primary action should have a quick-add affordance visible immediately. This follows the Apple Reminders model: the text field is always at the bottom, ready to go. No FAB required when a persistent input is visible.

### Pattern 7: Invite-first onboarding with immediate value for solo users

The best household apps handle both paths: (a) you're setting it up alone, (b) someone sent you a link. The solo path must demonstrate value immediately so the user has a reason to invite others. The referral path must reach the first meaningful action without requiring a full account setup flow.

---

## Onboarding Benchmarks

### Industry Data

- **72%** of users abandon apps if onboarding requires too many steps (Localytics)
- **82%** of trial starts occur on Day 0 of install — meaning the first session determines whether users ever pay
- Day-1 uninstall rates: **20-25%** across mobile apps
- Day-7 retention: **~13%** median
- Day-30 retention: **~7%** median
- Users decide whether to continue using an app within the **first 2-3 minutes**

### What Works

**1. Household-first, not feature-first**
The frame must be "let's set up your household" not "let's tour our 10 features." Cozi onboards by creating a family calendar immediately. OurHome starts by adding household members. The household context is the value — lead with it.

**2. Single-person setup path**
The admin creates the household, invites others later. If the onboarding blocks on "add members now," it fails for the common case where the admin is setting up alone. Invite link copy-paste after setup is the right model.

**3. First meaningful action in under 60 seconds**
For Roost, the benchmark should be: household created, one chore assigned (or one grocery item added) within the first minute. This is achievable in the current 3-step onboarding but the V2 version should aggressively reduce cognitive load on each step.

**4. Deferred permission requests**
Push notification permission should not be requested during onboarding. Request it contextually: after the user adds their first reminder, or after they complete their first chore. Premature permission requests are denied at higher rates.

**5. Pre-populated templates as shortcuts**
Cozi offers template household routines (school schedule, sports schedule). OurHome offers default chore templates. Offering a "start with suggested chores" option dramatically reduces time-to-setup for new households. Roost already seeds default chore categories — consider seeding 2-3 suggested chores as well.

**6. Reluctant member path is as important as Admin path**
The member who gets an invite link and has never heard of Roost must reach their first view of the household in under 2 minutes. FamilyWall's learning-curve problem comes from trying to onboard all members the same way as admins. Members need a lighter path: join household, see what's assigned to you, done.

### Specific Anti-Patterns to Avoid in Onboarding

- Do not force a profile photo upload during onboarding
- Do not request location permission during onboarding (request it in settings, contextually)
- Do not show a feature tour carousel — users skip them and feel deceived when features are more complex than the carousel suggested
- Do not require payment method entry before demonstrating value

---

## Ad Monetization Examples

### The Right Reference Points

**Duolingo** (most studied tasteful ad implementation)
- Banner at the bottom of lesson results screens
- Never interrupts a lesson in progress
- Premium removes ads — the ad placement is a gentle, constant reminder of the premium value proposition
- Ad zone is visually contained and clearly separated from content

**Weather apps** (highly comparable to Roost's context)
- Weather Underground, Weather Channel: banner at bottom of the main weather view
- Never overlaid on weather data
- Clear visual separation (light border, different background shade)
- Contextual ads (outdoor gear, travel, home services) that feel relevant

**Pocket Casts / podcast players**
- Tasteful banner only in episode list, not in player view
- Critical flows (playback, episode save) are always ad-free

### Implementation Principles for Roost

**Where ads belong:**
- Persistent bottom banner in the Today/dashboard view (below content, above tab bar, or just above the tab bar zone)
- At the bottom of feature list pages when scrolled to the end (grocery list, chores list) — never inline with items

**Where ads must never appear:**
- During onboarding (any step)
- During the checkout/billing flow
- During the expense settle-up flow
- During any data entry (expense form, chore form, event form)
- Inside a bottom sheet
- On the child account view (children should never see ads)

**Technical approach that preserves Apple-native feel:**
- Fixed-height banner zone (e.g., 50px) that is part of the page layout, not an overlay
- The zone is always occupied by either an ad (free) or nothing (premium) — never collapses to cause layout shift
- Light separator line above the zone
- Tap on ad opens a modal (not the full browser), so users can return to context instantly

**Revenue expectation:**
- Banner ads: ~$2.80 CPM (2024 US market)
- At 1,000 daily active free users, 10 page views per session: approximately $28/day or ~$840/month
- This is supplemental, not primary revenue — premium subscriptions will dominate at scale
- Primary value of ads is psychological: they make the premium tier feel valuable by contrast

---

## Monetization Benchmarks

### Freemium vs. Hard Paywall (RevenueCat 2025 Report, 75,000+ apps)

| Model | Median Day-35 Conversion | Notes |
|-------|--------------------------|-------|
| Hard paywall | 12.11% | Higher refund rate (5.8%) |
| Freemium | 2.18% | Lower refund rate (3.4%) |
| Trial-based | ~6-8% (varies) | Best when trial-to-paid rate >40% |

**Implication for Roost:** The freemium model will convert 2-3% of registered households to premium. The ad revenue on the other 97-98% is what makes this economically viable vs. leaving them with zero monetization.

### Price Point Data

- North America median subscription: $29.99/year (~$2.50/month)
- Upper quartile: ~$89.99/year (~$7.50/month)
- Higher-priced apps ($8-10/month range) see 9.8% download-to-trial conversion vs. 4.3% for lower-priced
- But lower-priced apps see 47.8% trial-to-paid vs. 28.4% for higher-priced — suggesting sweet spot

**Roost's $4.99/month per household is in the right zone.** It is:
- Below the psychological $5 threshold that triggers subscription fatigue
- Comparable to Splitwise Pro ($5/mo) and FamilyWall ($4.99/mo) — familiar pricing
- Defensible as "less than one coffee" for the entire household
- Per-household positioning makes it feel more fair than per-user (Splitwise at $5 per person is $15-25 for a household)

### Retention Benchmarks

- **Family plans increase retention by 52%** — this is the strongest data point for per-household pricing
- 37% of subscribers share their subscription with someone outside their household (signals demand for family/group plans)
- Nearly 30% of annual subscriptions cancel in Month 1 — onboarding quality directly impacts revenue
- Annual plan holders retain much better than monthly (month-1 cancellations are mostly monthly subscribers)

**Implication:** Push annual pricing aggressively. Offer a "1 month free" with annual to close the gap. A household that commits annually ($59.88/year) is far more likely to stay active and refer others.

### Comparable App Conversion Rates

- OurHome, FamilyWall, similar apps: estimated 3-6% premium conversion based on freemium category benchmarks
- Productivity apps with strong free tiers: 2-5% is the realistic range
- Apps where free tier includes tasteful ads: slightly higher premium conversion because users feel the constant reminder (Duolingo effect)

**Realistic Roost V2 targets:**
- Year 1: 2-4% of active households convert to premium
- Year 2: 4-7% with word-of-mouth from families with children (highest-retention segment)
- LTV target: ~$60 (annual plan, 1.5-year average household tenure)

---

## Implications for Roost V2

### 1. The "Splitwise refugee" opportunity is real and time-limited

Splitwise's 2024 pricing changes drove significant user exodus. Users actively looking for an alternative expense tracker are a warm acquisition channel. The Roost marketing page should name this explicitly: "Track shared expenses without the daily limits or 10-second video ads." This is a competitive window that closes as users find other alternatives.

### 2. IA is the product — fix it before anything else

The competitor audit consistently shows that apps with good features but poor IA (FamilyWall, OurHome) fail to achieve broad adoption. The V2 IA restructuring (5 tabs, grouped by mental model) is the highest-leverage V2 change. It should be the first thing designed and the last thing changed.

### 3. The household member adoption problem is the #1 churn driver

"A simple app used by everyone beats a feature-rich app used by one person" is the most repeated finding across competitor reviews. V2 must obsessively reduce the friction for the second, third, and fourth household member to join and see immediate value. This means: lightweight member onboarding, immediate personalized view ("here are the 3 chores assigned to you"), and persistent low-friction interaction patterns.

### 4. Child accounts are a defensible moat — invest here

No competitor has a modern, well-designed child account system with chore rewards, age-appropriate UI, and allowance math. Families with children in the app have much higher retention than any other segment. The V2 design for child UI (PIN login, personal chore view, reward progress) should be treated as a first-class experience, not a bolt-on.

### 5. Grocery list is the daily driver; everything else is the hook

Users open their grocery list multiple times per week. They open their expense tracker monthly. They open the calendar a few times a week. The grocery list is the habit-forming entry point that keeps the app installed. If the grocery UX is slow or unreliable, the whole household abandons the app. This must be the fastest, most offline-resilient part of Roost.

### 6. Annual pricing is structurally better for this category

Given family plans' 52% retention advantage and the near-30% Month-1 cancel rate on monthly plans, V2 should prominently push the annual option. Framing: "$49.99/year for your whole household — that's 12 months for the price of 10."

### 7. Ad implementation must be invisible to premium users and tasteful for free users

The Splitwise lesson is that bad ads (unskippable video, frequency capping violations, interrupting core flows) destroy goodwill faster than any feature failure. The Duolingo lesson is that tasteful, contextually-relevant banner ads that appear in natural pause points (end of a list, after completing a chore) do not meaningfully hurt retention and do drive premium conversion by demonstrating the value of "ad-free."

### 8. Do not try to compete with Cozi on calendar

Cozi has 10+ years of trust with families specifically as a calendar app. Roost's calendar should be good and reliable, but it is not the differentiator. Trying to out-Cozi Cozi by adding calendar-specific features is a distraction. The differentiator is that Roost's calendar is connected to chores, expenses, grocery, and meals in one place.

### 9. The onboarding must demonstrate value before asking for commitment

Given that 82% of trial starts and conversions happen on Day 0, the V2 onboarding must not end at "household created." It should end at "you've set up 3 chores and added 2 items to your grocery list." The paywall (or in V2's model, the premium upgrade prompt) should appear only after the user has had a complete first-use cycle. Showing the premium gate before demonstrating free-tier value is the most common conversion-killing mistake.

### 10. Notification permission is a prerequisite for retention, but must be earned

Family/household apps that fail to get notification permission lose their entire reminder and chore-reminder value proposition. Push notification opt-in should be requested immediately after the user completes their first chore or adds their first reminder — at the moment of highest perceived relevance. Never request it during onboarding.

---

## Sources

- Competitor data: App Store reviews, Google Play reviews, competitor websites (as of research date)
- RevenueCat State of Subscription Apps 2025 (75,000+ apps, $10B revenue analyzed): https://www.revenuecat.com/state-of-subscription-apps-2025/
- Splitwise pricing backlash: https://kimola.com/reports/splitwise-app-criticism-pricing-limitations-146626
- Cozi review 2025: https://ourcal.com/blog/cozi-app-review-2025
- FamilyWall pricing 2026: https://www.usecalendara.com/blog/familywall-pricing-2026
- OurHome review: https://www.daeken.com/blog/ourhome-app-review/
- Tody review: https://www.apartmenttherapy.com/tody-cleaning-app-review-37282867
- Mobile app onboarding benchmarks: https://userguiding.com/blog/user-onboarding-statistics
- Banner ad placement: https://www.appeneure.com/blog/how-banner-ad-placement-affects-app-revenue/seobot-blog
- Linear UI redesign: https://linear.app/now/how-we-redesigned-the-linear-ui
- Family plan retention (52%): https://marketingltb.com/blog/statistics/subscription-statistics/
- Mobile navigation patterns: https://www.shortcut.io/news-events/app-navigation-patterns-and-why-the-tab-bar-probably-should-be-your-first-choice
- Things 3 design: https://culturedcode.com/things/features/
