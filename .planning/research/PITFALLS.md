# Pitfalls Research: Roost V2

**Domain:** Household management super-app (web + native iOS/Android)
**Researched:** 2026-05-01
**Overall confidence:** HIGH for categories 1-4, 6-7, 9; MEDIUM for 5, 8, 10

---

## Critical Pitfalls (Project-Killers)

### 1. The Admin Island: Only One Person Ever Uses It

**What goes wrong:** The household admin downloads the app, sets it up, adds all the chores, creates the grocery list — and then nobody else ever joins. The app becomes a private to-do list for one person. The admin stops using it within 2-3 weeks because the whole value proposition (shared coordination) never materializes.

**Why it happens:** Multi-user household apps have a structural cold-start problem worse than most networked products. The admin has motivation to set things up. Every other household member is a "reluctant joiner" — they were told to download an app, which feels like homework. If the join flow takes more than 60 seconds, has any confusion, or requires creating an account before showing any value, they abandon. The admin sees the invites go unaccepted and quietly gives up.

Specific failure modes:
- Invite requires the member to create a full email/password account before they can see anything
- Invite link expires before the member clicks it (common with 7-day TTLs and low-engagement recipients)
- Member joins but lands on a confusing dashboard with no context ("what am I supposed to do here?")
- No value is visible to the member until the admin has done substantial setup work first
- No notification or reminder mechanism to nudge uninvited members

**Warning signs:** Zero household members added after admin onboarding in your analytics. Invite links generated but not converted. Short session duration on the invite landing page.

**Prevention:**
- Make the invite join flow require zero account setup for the first session: show the household, show what's in it, let them interact before requiring a password
- Invite link TTL should be 7 days minimum; consider 30 days for household context (V1 already uses this, keep it)
- After invite link is generated, send a follow-up reminder at 48 hours if not accepted
- The post-join landing for new members must show immediate value: the grocery list, upcoming events, or assigned chores — not an empty dashboard
- Design for the scenario where the admin sends the invite via iMessage and the member taps it three days later; it must still work and be welcoming
- Pre-populate the household with example data (or a short walkthrough) during the admin onboarding so the member sees a "live" household rather than emptiness

**Phase where this bites:** Immediately at launch. This is the first-week retention killer. If this isn't solved, no other metric matters.

---

### 2. The `db:push` Time Bomb in Production

**What goes wrong:** The V1 codebase uses `drizzle-kit push` exclusively for all schema changes. This works fine during development and early production with no real users. On V2, you are now operating against a live database that has real user data, and you need to make structural schema changes (new columns, new tables, relationship changes) to support the redesigned IA. At some point, `db:push` silently drops a column or changes a constraint on a table that has live data in it.

**Why it happens:** `drizzle-kit push` is explicitly documented as a prototyping tool, not a production migration tool. It computes the diff between your schema definition and the live DB and applies it directly — including destructive operations like `DROP COLUMN`. There is no migration history, no rollback, no dry-run confirmation in automated contexts. When V2 schema diverges from V1 (which it will — new tables, restructured relationships, new columns), a single `db:push` can silently drop columns with data in them.

Specific scenarios for V2:
- V2 removes a column from the schema that V1 still writes to: push drops the column, V1 code on the rollback path is now broken
- V2 renames a column (e.g., refactoring `notify_user_ids` storage): push drops the old column and adds the new one, migrating zero data
- During V2 development on the rebuild branch, a developer runs `db:push` against production instead of staging: instant data loss

**Warning signs:** No migration history files in the repo. The command `npm run db:push` is run from developer machines pointing at the production DATABASE_URL.

**Prevention:**
- Switch to `drizzle-kit generate` + `drizzle-kit migrate` immediately for the V2 rebuild branch, before any schema changes
- Create a staging Neon branch (Neon supports database branching natively, free) that V2 development uses exclusively
- Lock the production DATABASE_URL behind a separate environment variable (`DATABASE_URL_PROD`) that is never present in local `.env.local`
- Every schema change in V2 must be reviewed as a SQL migration file before apply — no exceptions
- For the V1-to-V2 cutover: write and test all additive migrations (new columns with defaults, new tables) in staging first, then apply to production with a backup taken immediately before
- Take a Neon point-in-time restore snapshot before every migration applied to production

**Phase where this bites:** V2 development phase, specifically when the new IA requires schema changes that touch tables with live V1 data. The danger window is the entire parallel development period.

---

### 3. Apple Guideline 3.1.1 Misconfiguration: Stripe Web Purchase Not Properly Isolated

**What goes wrong:** The iOS app mentions, links to, or promotes the Stripe/web checkout path in a way that Apple's reviewers detect during App Store review. The app is rejected. In the worst case, this is discovered after the app is already live and Apple flags it during a routine re-review, causing the app to be pulled.

**Why it happens:** Apple's Guideline 3.1.1 requires that all digital goods and subscriptions purchased from within the iOS app use Apple's In-App Purchase system. After Epic v. Apple (2025), U.S. apps can now link to external web checkout, but only with specific disclosure language, only for U.S. users, and only following Apple's prescribed UI patterns. The rule still applies in full outside the U.S. App Store.

The dual-billing architecture (RevenueCat for IAP + Stripe for web) is specifically designed for this situation, but it is easy to misconfigure:
- Showing a "Subscribe on web for cheaper" button inside the iOS app to global users violates 3.1.1
- Any copy inside the app that mentions pricing differences between web and IAP (e.g., "$4.99/month on iOS, $4.99/month on web") is a steering violation
- Mentioning that ad-free is available on the web but must be paid via IAP on iOS confuses Apple reviewers
- The settings/billing page on web must not be accessible from within the iOS app in a way that lets users complete a Stripe payment

**Warning signs:** A Stripe checkout link or mention anywhere in the Expo codebase. The word "web" appearing near pricing in any in-app copy. Any conditional rendering that shows Stripe checkout to iOS users.

**Prevention:**
- The iOS app must use RevenueCat + Apple IAP exclusively for all premium purchases — no exceptions, no workarounds
- The settings billing page on web must be unreachable from the iOS app (no in-app browser link to it)
- For U.S. users only: if you implement the Epic anti-steering disclosure flow, use RevenueCat's Web Purchase Button which handles the mandated disclosure sheet automatically
- Before App Store submission, audit every screen in the iOS build for any mention of web pricing, Stripe, or alternative payment methods
- Keep the iOS build's environment config completely separate from web — the Stripe public key should not exist in the Expo app bundle at all

**Phase where this bites:** App Store submission. Also can surface during re-reviews after updates.

---

### 4. Feature Sprawl Causing Navigation Confusion That Kills Retention

**What goes wrong:** V1's diagnosis is correct: 9+ nav items at the same hierarchy level communicates nothing about what the app is "for." V2 is explicitly fixing this. The trap is that V2 introduces new features (ads, revenue model changes, Android, widgets) and incrementally re-adds items to the top-level nav over time, re-creating the problem. Each individual addition feels justified. The cumulative effect destroys the IA.

**Why it happens:** The failure mode for super-apps in Western markets is specifically that they aggregate features without a clear user mental model. Apps like Cozi have stagnated because they added calendar, then grocery, then to-dos, then recipes — each feature correct in isolation, but the whole never cohered into a clear product identity. Users open the app and don't know what to do first. They use one feature occasionally and ignore the rest. Retention regresses to single-feature usage, which doesn't justify the complexity.

The V2 IA (5 tabs: Home, Household, Money, People, More) is correct. The pitfall is in the months after launch.

**Warning signs:** A second feature gets added to the top-level tab bar. A new standalone page is created without a clear home in the existing IA. The "More" tab grows to more than 6-7 items. Any feature gets its own nav item based on business priority rather than user mental model.

**Prevention:**
- Treat the 5-tab structure as a constitutional constraint: any new feature must fit into an existing tab. This is a veto-level decision.
- Establish the rule before launch: new feature gets added to an existing section, or it doesn't ship at the top level. No exceptions.
- For every new feature, ask: "Where does a user expect to find this given the existing tab names?" If the answer is ambiguous, the feature belongs in "More" until usage justifies promotion.
- Audit the IA against actual usage data at 60 and 90 days post-launch. Feature placement should follow behavior, not build order.

**Phase where this bites:** Post-launch feature additions. The initial architecture is correct; the risk is erosion over time.

---

### 5. The Rewarded Activity Without the Household: Child Accounts That Orphan

**What goes wrong:** Child accounts are created by parents. The child's entire experience (chore completion, rewards, streaks) depends on the parent/admin having set things up: chores assigned, reward rules configured, categories created. If the parent doesn't do this setup, the child opens the app and sees an empty screen. A child who opens an app and sees nothing will never open it again. The parent loses faith in the product.

**Why it happens:** Child UX is universally harder to design for because the child cannot self-serve — they have no permission to configure anything. Every piece of value they receive depends on adult action. If the admin onboarding doesn't explicitly prompt for "add a child and assign their first chore," child accounts become dead ends.

**Warning signs:** Child accounts created but zero chores assigned. RewardsWidget showing empty state. Children not logging in after first session.

**Prevention:**
- The admin onboarding flow must include a dedicated step for child setup if `is_child_account` members are added: "Add your first chore for [child name]"
- The child's first session must show something — even a placeholder chore or a welcome message that shows their name and that the household is ready for them
- The Rewards widget should show a motivating "waiting for chores" state rather than an empty state when no rules are configured yet
- Parent should receive a push notification 24 hours after adding a child account if no chores have been assigned: "Don't forget to assign chores to [child name]"

**Phase where this bites:** Onboarding and first-week retention for households with children.

---

## Significant Pitfalls (Quality Killers)

### 6. Banner Ads Placed in Active-Flow Screens

**What goes wrong:** A banner ad unit is placed at the bottom of a grocery list screen, chore completion screen, or expense entry sheet. The ad occupies the exact same vertical zone as the primary action button (Add Item, Save, Mark Done). Users accidentally tap ads when trying to complete their task. They feel manipulated. This specific pattern drives disproportionate uninstalls and 1-star reviews.

**Why it happens:** Banner ads are almost universally placed at the bottom of screens because that is the standard AdMob/MoPub/AppLovin position. But Roost's primary actions are also at the bottom (FABs, sheet save buttons, bottom nav). The collision is architectural.

**Warning signs:** Reviews mentioning "accidentally clicked an ad," accidental ad click rates significantly above industry average (industry average is 0.35% for banners; above 1% suggests accidental taps), or high exit rates from specific screens.

**Prevention:**
- Define the ad zone as the space between the page header and the first content item — never at the bottom where action buttons and bottom nav live
- Alternatively, implement a sticky top banner below the top bar, with sufficient margin to prevent confusion with nav elements
- The ad zone must be a fixed height with explicit visual separation (a subtle border or background shift) — never inline with list content
- Test every ad-carrying screen with fat-finger simulation: tap the ad zone area on an actual device, confirm no primary action is within 48px
- Per the PROJECT.md design rule: "Ads appear only in a designated banner zone. Never inline with content. Never during critical flows." Treat any violation as a critical bug, not a UX suggestion.

**Phase where this bites:** iOS launch and any subsequent release that adds new screens.

---

### 7. Expo Runtime Version Mismatch After OTA Update

**What goes wrong:** An OTA update (via EAS Update) is pushed that inadvertently includes a native module change. The update is applied to users running the old native build. The app crashes on launch for those users. Because Expo's OTA system bypasses App Store review, the bad update reaches all users instantly. Rollback requires pushing a new OTA update or users manually uninstalling and reinstalling.

**Why it happens:** EAS Update (OTA) can only update JavaScript and bundled assets. It cannot update native code (Objective-C/Swift, Java/Kotlin, or anything in `ios/` or `android/`). If a developer adds a native module (e.g., expo-notifications, expo-camera, react-native-haptic-feedback) and pushes that as an OTA update, the JS code references a native module that doesn't exist in the installed binary. The app crashes immediately on the affected runtime version.

This is specifically dangerous for Roost because:
- Push notifications require a native build (Expo Notifications is native)
- The ad SDK (AdMob or equivalent) requires a native build
- Any new Expo SDK or package upgrade that touches native modules requires a full EAS Build + App Store submission

**Warning signs:** Adding a new `expo-*` package or `react-native-*` package and pushing an OTA update without a new native build. The `runtimeVersion` in `app.json` not being bumped when native changes are made.

**Prevention:**
- Set a strict rule: any change to `package.json` that adds or upgrades a package with native code requires a full EAS Build, not an OTA push
- Configure `runtimeVersion` in `app.json` as a managed field that is incremented whenever native code changes
- Never push OTA updates to the production channel without testing on a development build first
- Maintain a clear inventory of which packages have native code: expo-notifications (native), expo-camera (native), any ad SDK (native). Treat these as deployment-gating changes.
- Use EAS Update's `--channel` system: publish to a `staging` channel first, verify on real devices, then promote to `production`

**Phase where this bites:** Post-launch when adding push notifications, ad SDKs, or upgrading Expo SDK versions.

---

### 8. RevenueCat Entitlement Desync: Web Subscriber Appears as Free on iOS

**What goes wrong:** A user subscribes on the web (Stripe), opens the iOS app, and still sees ads and the premium gate. They email support furiously. This is a support nightmare and a refund risk.

**Why it happens:** RevenueCat's Stripe integration requires explicit linking of the Stripe customer to a RevenueCat app_user_id. When a user subscribes via Stripe web checkout, RevenueCat does not automatically know which mobile app user that is unless:
1. The web checkout was initiated from the app (using RevenueCat's Web Purchase Button, which embeds the user ID), OR
2. Your backend explicitly calls the RevenueCat REST API to attach the Stripe subscription to the correct app_user_id after checkout completes

If your Stripe webhook fires and you update `households.subscription_status` in your database but don't also notify RevenueCat, the iOS app's `Purchases.getCustomerInfo()` call still returns no active entitlements. The source-of-truth split (Neon DB for web, RevenueCat for iOS) creates a gap.

**Warning signs:** Users reporting premium features inaccessible on iOS after subscribing on web. RevenueCat dashboard showing users as free who your DB shows as premium.

**Prevention:**
- Design the entitlement architecture upfront: decide whether Neon `subscription_status` or RevenueCat is the single source of truth for the iOS app
- Recommended: use RevenueCat as the single source for the iOS app; on Stripe webhook `checkout.session.completed`, call the RevenueCat REST API to attach the subscription to the user's app_user_id, then update Neon DB
- Test the full round-trip before launch: subscribe on web, open iOS app, confirm entitlement appears within 30 seconds
- Build an "I already subscribed on web" recovery flow in the iOS settings: a button that forces a RevenueCat `syncPurchases()` or triggers a server-side entitlement refresh
- Monitor RevenueCat's "customers without active subscription" dashboard against your Neon premium users list; discrepancies indicate desync

**Phase where this bites:** iOS launch, any user who subscribes via web first.

---

### 9. `drizzle-kit push` Against Shared DB During Parallel V1/V2 Development

This is distinct from pitfall #2. Pitfall #2 covers data loss during migration. This one covers the specific V2 scenario.

**What goes wrong:** V2 development on `rebuild/v2` uses `db:push` against the shared Neon production database. A V2 schema change that V1 code doesn't expect breaks V1 in production for existing users. Because `db:push` applies immediately, there is no staging gate.

**Warning signs:** V1 and V2 schemas diverge. V2 `src/db/schema/` files have tables or columns that V1 code does not handle gracefully (null checks, missing joins, etc.).

**Prevention:**
- Create a Neon database branch immediately at V2 kickoff. Neon branching is free, instant, and gives V2 a full copy of production data to develop against
- V2 branch points at `DATABASE_URL_V2` (the branch), never at the production URL
- All V2 schema changes are developed and tested in isolation on the branch
- The V1-to-V2 cutover migration plan must be executed as a single, atomic, reviewed operation against production — not accumulated `db:push` runs

**Phase where this bites:** The entire V2 parallel development period (months 1-3).

---

### 10. React Native FlatList Performance Collapse on Grocery and Activity Screens

**What goes wrong:** The grocery list and activity feed render long lists. On iOS, scrolling becomes noticeably janky once there are 50+ items. On Android, it can stutter even earlier. Users who open the grocery list and experience jank lose trust in the app quality immediately — grocery is one of the highest-frequency interactions in a household app.

**Why it happens:** React Native's default `FlatList` measures each item's height individually during render, causing per-item layout passes. In lists with checked/unchecked state, quantity text, and avatar rows (like Roost's grocery items), each row has multiple sub-renders. If the FlatList is inside a ScrollView (common when page layout puts the list below a header), `FlatList` virtualization is disabled entirely — every item renders regardless of scroll position.

**Warning signs:** FlatList nested inside ScrollView anywhere in the Expo codebase. Any grocery or activity list screen without `getItemLayout` defined. Lists without `keyExtractor` returning stable string keys.

**Prevention:**
- Never nest FlatList inside ScrollView. Use `ListHeaderComponent` and `ListFooterComponent` props on the FlatList itself instead of wrapping in ScrollView
- Implement `getItemLayout` for all lists with fixed-height rows (grocery items, chore rows, expense rows)
- Replace `FlatList` with `FlashList` (Shopify) for the grocery list and activity feed — it provides ~10x faster rendering via component recycling and is Expo-compatible
- Implement `React.memo` on list row components (GroceryItemRow, ActivityItem, ChoreRow) to prevent parent re-renders from cascading to all list items
- Apply `removeClippedSubviews={true}` and tune `windowSize` (default 21, reduce to 5-9 for lists that don't need large off-screen buffers)
- Test with 100+ items in the grocery list before launch — generate seed data for this test

**Phase where this bites:** First real-usage scenario with an established household (week 2-4 post-launch for active families).

---

### 11. Bottom Sheet / Keyboard Interaction Failures on iOS

**What goes wrong:** A DraggableSheet opens, the user taps into a text input, and the keyboard appears — pushing the sheet content up in an uncontrolled way, obscuring input fields, or causing the sheet to partially close. On specific iOS versions, the sheet snaps to an unexpected snap point when the keyboard appears. This is one of the most common negative reviews for any sheet-heavy iOS app.

**Why it happens:** The web implementation uses Radix Dialog / shadcn Sheet, which handles keyboard avoidance via browser native behavior. Expo requires explicit keyboard avoidance via `KeyboardAvoidingView` or `@gorhom/bottom-sheet`'s built-in `BottomSheetTextInput`. A custom `DraggableSheet` component built with Reanimated v3 will need explicit keyboard handling wired up — it won't inherit browser behavior.

The Expo migration will need to re-implement every sheet (ChoreSheet, ExpenseSheet, EventSheet, etc.) using React Native bottom sheet primitives. If `KeyboardAvoidingView` is not correctly configured (wrong `behavior` prop: "height" vs "padding" vs "position" differ per iOS version), inputs get covered.

**Warning signs:** Any sheet in the Expo codebase not using `@gorhom/bottom-sheet` v5 with `enableDynamicSizing` and `keyboardBehavior`. Text inputs inside sheets that are not `BottomSheetTextInput` instances.

**Prevention:**
- Use `@gorhom/bottom-sheet` v5 as the standard bottom sheet primitive for all Expo sheets — do not build a custom implementation
- Use `BottomSheetTextInput` (exported from `@gorhom/bottom-sheet`) for all text inputs inside sheets — it handles keyboard events internally
- Test every sheet on a physical iPhone (not Simulator) with the software keyboard — simulators do not accurately replicate iOS keyboard behavior
- Set `keyboardBehavior="interactive"` and `keyboardBlurBehavior="restore"` on all sheets that contain text inputs
- The existing `onOpenAutoFocus={(e) => e.preventDefault()}` pattern from the web (Radix) does not exist in React Native — manage initial focus explicitly in the sheet's `onOpen` callback

**Phase where this bites:** Expo development phase, before iOS launch.

---

### 12. Freemium Conversion Failure: Premium Value Invisible Until After Purchase

**What goes wrong:** Users use the free tier for weeks, ads don't bother them enough to pay, and the premium features they've never seen don't feel valuable. Conversion rate is below 1%.

**Why it happens:** Research consistently shows that users don't upgrade for features they've never experienced. The free tier is complete enough (chores, grocery, calendar, tasks work) that the gap to premium isn't felt as pain. The ad-free benefit alone converts only ~6% of users who do pay — it's a weak primary driver for a $4.99/month commitment. Premium gates that simply say "upgrade to unlock" without showing what the user is missing do not convert.

Specific Roost risks:
- Receipt scanning is premium but users who've never tried it don't miss it
- Rich text notes feel like a "nice to have" until you've tried them
- Household stats are only valuable to organized households who are already heavy users

**Warning signs:** Conversion rate below 1.5% at day-30. High engagement on free features (chores, grocery) with near-zero tap rate on premium gate CTAs.

**Prevention:**
- Give every free user one "free trial" of a premium feature: one receipt scan, one rich-text note, one month of stats — then gate. The first use creates the value memory.
- Show a live preview of what premium looks like: the PremiumGate sheet should show a non-blurred, non-interactive preview of the feature with "This is what you're getting" framing
- The strongest conversion driver is friction: make the ad experience slightly more present in high-frequency flows (grocery checkout, chore completion) so the "ad-free" value proposition is felt, not just described
- Time the premium upsell to moments of peak engagement: after the user completes 5 chores (they're engaged), after the household reaches 3 members (they're committed), after first settle-up (they're transacting)
- Consider a 7-day free trial for new signups. Trial users convert at 2-3x the median rate.

**Phase where this bites:** Weeks 2-6 post-launch when the initial engagement peak drops off.

---

### 13. Solo Dev Scope Collapse: Building for Simultaneous Web + iOS Launch

**What goes wrong:** The 3-4 month timeline for "web + iOS simultaneous launch" assumes linear progress. In practice, the web rebuild and the Expo app are two separate products that share API but have entirely different UI codebases. Debugging on both platforms doubles the surface area. A bug in the Expo navigation system doesn't exist on web. An iOS keyboard issue doesn't exist on web. At month 3, you have a 70% complete web app and a 40% complete Expo app and the gap is not closeable in 2 weeks.

**Why it happens:** Solo developers consistently underestimate by a factor of 1.5-2x on build timelines, and this project has two compounding factors: (1) it is a V2 overhaul (not greenfield — you must match V1 feature parity), and (2) it targets two UI platforms simultaneously. Every feature must be designed twice: once for web (shadcn/Tailwind/Radix) and once for Expo (RN components/bottom sheets/gesture handler). State management, data fetching, and navigation differ between platforms.

Additional scope traps specific to this project:
- Ad SDK integration requires native code: AdMob or equivalent requires EAS Build, Apple developer account permissions, and App Store privacy manifest updates
- RevenueCat IAP integration requires sandbox testing on physical devices
- Expo push notification setup (APNs certificate, FCM credentials, EAS secrets) takes 1-2 full days to configure and test end-to-end
- The Expo app must pass App Store review: build a 2-week buffer for review cycles and potential rejections

**Warning signs:** Week 6 and the Expo project directory doesn't exist yet. Web progress is blocking mobile work ("I'll do mobile once web is done"). No Expo build in TestFlight by week 8.

**Prevention:**
- Start the Expo project in parallel from week 1, even if it is a skeleton with navigation only
- Define a hard MVP scope for the iOS launch: not "all V1 features" but "the 5 features with highest daily use" (grocery, chores, calendar, dashboard, expenses)
- Consider staggering: ship web first (week 8-10), ship iOS 4-6 weeks later. This is explicitly allowed by the project plan. The simultaneous launch goal may be aspirational; plan for staggered and treat simultaneous as a stretch goal.
- Time-box each Expo feature to match its web counterpart: grocery web = 3 days, grocery Expo = 5 days. If Expo is taking 3x web time, scope must be cut.
- Have TestFlight builds running by week 4, even with stub screens. The App Store submission process takes 1-3 days; Apple can reject for reasons unrelated to feature completeness.

**Phase where this bites:** Month 2-3, when the Expo debt becomes visible.

---

## App Store Specific Pitfalls

### P-A1: Child Account Data and COPPA / Apple's Age-Related Guidelines

**What goes wrong:** App is rejected or, worse, removed post-approval because child accounts (is_child_account=true) are treated as a kids app category by reviewers, triggering Kids Category requirements: no third-party analytics, no behavioral ads, no data collection without verifiable parental consent. Apple's review can re-examine this at any update.

**Risk for Roost:** Roost has a PIN-based child login and explicit child role. If the reviewer interprets this as "an app designed for children," it could be categorized as a kids app — which prohibits AdMob, Google Analytics, Sentry error tracking, or any third-party SDK that may collect device identifiers.

**Prevention:**
- Position Roost clearly as a household management tool for adults that also has child participation features — not an app targeted at children
- In the App Store metadata: category = Productivity or Lifestyle, not Kids. App description must lead with adult use cases.
- Do not show child accounts as the primary onboarding path — child accounts are created by admins, never self-serve
- Before using any analytics or ad SDK on iOS, audit their data collection practices: if they collect IDFA or device identifiers, you need ATT (App Tracking Transparency) prompt, which adds friction. AdMob specifically requires ATT.
- If Apple questions child account safety: document that child accounts can only be created by adults who own the household, PINs are hashed, and children cannot provide any personal data themselves

---

### P-A2: Missing NSUsageDescription Strings

**What goes wrong:** App is rejected on first submission with an automated rejection citing missing `NSCameraUsageDescription` or `NSPhotoLibraryUsageDescription`.

**Risk for Roost:** Receipt scanning (camera + photo library), location for weather (NSLocationWhenInUseUsageDescription), and push notifications (handled by Expo's permissions flow). Missing any one of these causes immediate rejection.

**Prevention:**
- Audit every Expo permission your app uses before submission: camera, photo library, location, notifications, microphone (if any)
- Add all required `NSUsageDescription` strings to `app.json` under `expo.ios.infoPlist` with clear, honest user-facing descriptions (Apple rejects vague descriptions like "used by the app")
- Expo config plugins for `expo-notifications` and `expo-location` auto-inject some of these; verify which ones need manual additions
- Do a dry-run submission to TestFlight (not App Store) to catch configuration rejections before the real submission

---

### P-A3: Duplicate App Name

**What goes wrong:** The name "Roost" is already taken on the App Store by another app, requiring a name change at submission time — after all marketing materials, the web domain, and the brand identity have been built around "Roost."

**Prevention:**
- Search the App Store for "Roost" before any external marketing commitment (this should be done before launch preparation begins, not during)
- If "Roost" is taken: variations like "Roost: Household OS" or "Roost Home" are valid as display names with "Roost" as the short name. The bundle identifier (com.yourname.roost) is separate and not globally unique in the same way.
- Verify the `app.json` `name` field resolves to a non-conflicting App Store listing

---

### P-A4: App Review Credentials Required for All Auth Flows

**What goes wrong:** App rejected because reviewer cannot log in. Child login requires a household code, which the reviewer doesn't have. Review gets stuck at the child-login screen.

**Prevention:**
- Provide demo credentials in the App Store Connect "Notes for Reviewer" section: a working admin email/password, the household invite code, and the child PIN
- The household must exist in the production database (not just staging) with realistic data visible to the reviewer
- Include a note explaining the child login flow and that it requires an existing household code — reviewers don't assume this

---

## Revenue Model Pitfalls

### P-R1: Ads That Destroy the First-Session Experience

**What goes wrong:** A new user opens the app for the first time, sees an ad before they understand what the app does, and immediately questions whether they want to continue. First-session ads reduce Day-1 retention sharply.

**Prevention:**
- No ads during onboarding: the ad banner should not be visible until the user has completed household setup and reached the dashboard
- Consider a 3-day or 7-day ad-free grace period for new signups (ad network impression volume is negligible for new users; the retention cost of showing ads on Day 1 outweighs the revenue)
- The ad zone must be absent during: onboarding, auth flows, any premium checkout flow, any sheet that covers a payment or expense

---

### P-R2: Per-Household Pricing vs. Per-User Apple IAP Expectations

**What goes wrong:** Apple IAP subscriptions are attached to an Apple ID (a user), not a household. If two members of the same household both buy the premium subscription through IAP, RevenueCat sees two separate subscriptions. Your backend must correctly attribute the subscription to the household, not to the individual user. If attribution fails, one person pays and the household stays free, or both pay and you double-charge the household.

**Prevention:**
- The RevenueCat app_user_id must be set to the `household_id` at purchase time, not the `user_id` — this ensures the subscription is attributed to the household record
- Alternatively, set app_user_id to `user_id` but implement a backend webhook that, on `PURCHASE_COMPLETED` event from RevenueCat, looks up the user's household and upgrades `households.subscription_status`
- Before launch: test the scenario where Member A (not the admin) purchases IAP — does the household go premium? Does the admin see it? Does Member B see it?
- Communicate clearly in-app that premium is per-household ("Your entire household gets premium"), so members don't independently purchase

---

### P-R3: Ad SDK Adding 2-3 Seconds to App Startup Time

**What goes wrong:** The ad SDK (AdMob or equivalent) initializes on app launch, making a network request and loading ad inventory. On a cold start, this adds perceptible delay. On iOS, a slow cold start is a common negative review trigger.

**Prevention:**
- Initialize the ad SDK lazily, after the first meaningful screen has rendered, not in the app entrypoint
- Use a background thread or `requestAnimationFrame` equivalent to defer ad initialization
- Measure cold start time with and without the ad SDK using Expo's built-in profiling tools before shipping
- If startup delay exceeds 200ms, investigate the ad SDK's `initialize()` call patterns and consider deferring the banner ad render by 2-3 seconds after screen mount

---

### P-R4: RevenueCat Free Tier Overage at Scale

**What goes wrong:** RevenueCat's free tier covers up to $2,500 MRR. At $4.99/household/month, that is approximately 500 paying households before costs begin. The paid RevenueCat tier starts at $99/month. This is not a crisis — it means the product is working — but it should be anticipated as a budget item rather than a surprise.

**Prevention:**
- Document the RevenueCat pricing tier thresholds: $0 to $2.5k MRR = free; $2.5k-$10k MRR = $99/month; above that = percentage-based
- At 500 paying households, plan to either accept the $99/month overhead (covered by ~20 additional paying households) or re-evaluate the RevenueCat integration
- Monitor MTR (Monthly Tracked Revenue) in the RevenueCat dashboard proactively

---

## Phase Mapping

| Pitfall | Phase Risk | Prevention |
|---------|------------|------------|
| Admin Island / member adoption failure | Launch week | Frictionless invite join, pre-populated household, member-specific onboarding |
| `db:push` data loss | V2 development start | Switch to migrations immediately, Neon branch for V2 dev |
| Apple 3.1.1 Stripe rejection | App Store submission | No Stripe references in iOS build, RevenueCat IAP only on iOS |
| Feature sprawl post-launch | Months 3-12 | 5-tab IA as hard constraint, new features go into existing tabs |
| Child account orphan state | Onboarding, week 1 | Mandatory chore-assign step after adding child, motivating empty states |
| Banner ad placement collision | iOS launch | Ad zone above content, not bottom; 48px margin from action buttons |
| Expo OTA runtime version mismatch | Any post-launch update | Bump runtimeVersion on any native change, OTA only for JS-only changes |
| RevenueCat / Stripe entitlement desync | iOS launch | RC as single source of truth for iOS, server-side RC sync on Stripe webhook |
| Shared DB breaks V1 during V2 dev | V2 parallel development | Neon branch isolation, additive-only schema changes until cutover |
| FlatList performance collapse | Week 2-4 post-launch | FlashList, getItemLayout, no FlatList inside ScrollView |
| Bottom sheet keyboard jank on iOS | Expo development | @gorhom/bottom-sheet v5, BottomSheetTextInput, physical device testing |
| Premium conversion failure | Weeks 2-8 post-launch | Free trials, contextual upsell timing, visible premium previews |
| Solo dev scope collapse | Month 2-3 | Stagger web then iOS, hard MVP scope for Expo, TestFlight week 4 |
| COPPA / child account App Store rejection | App Store submission | Adult-targeted app positioning, no kids category, audit all third-party SDKs |
| Missing NSUsageDescription strings | App Store submission | Pre-submission audit, Expo config plugins review |
| First-session ads destroying retention | Launch day | No ads during onboarding, 3-7 day grace period for new users |
| Per-household IAP attribution error | iOS launch | household_id as RC app_user_id, test member-purchases-premium scenario |
| Ad SDK cold start latency | iOS launch | Lazy-initialize ad SDK, defer banner render 2-3s after first screen |
