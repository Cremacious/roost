# Changelog

All notable changes to Roost are recorded here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
with pre-release tags during beta.

## Versioning + release process

- Day to day work lands on a single version-named release branch
  (`release/<version>`, e.g. `release/1.0.0-beta.2`). Small fixes and minor changes
  accumulate there.
- When that branch has done its job (a coherent batch of updates), it is merged into
  `main`, the version is bumped, a tagged GitHub release is cut, this changelog is
  updated, and the branch is deleted. A fresh `release/<next-version>` branch starts
  the next cycle.
- Each merged batch is a version change. During beta the version increments the
  pre-release counter: `1.0.0-beta.1`, `1.0.0-beta.2`, ... up to the `1.0.0` stable
  release. All releases before `1.0.0` are marked as pre-releases on GitHub.
- Entries are grouped under Added / Changed / Fixed / Removed.

## [Unreleased]

Changes on the current release branch that have not yet been merged + released go here.

## [1.0.0-beta.2] - 2026-07-08

First update after the beta deployment: UI polish, an easier invite flow, and a
redesigned onboarding.

### Added
- Link-based member invites: an admin can generate an invite link; recipients join via
  the link, signing up and auto-joining the household if they do not already have an
  account (#110).
- Per-page one-time intro popups (welcome-modal style) on the feature pages, backed by a
  new `users.seen_intros` column (#112).

### Changed
- Redesigned onboarding as a full-screen, branded welcome at a larger scale, with Create
  and Join presented as large choice cards (#118).
- All button and CTA labels are now Title Case (#109).
- The logo is now background-aware so it reads clearly on light surfaces (#116).
- Household page hero: removed the share icon and made the household-code text readable (#111).
- Money heroes and buttons now use #159143 to match the /money hero, and the /money hero's
  non-red text is white (#117).
- The /today all-clear hero color changed from green to red (#CE1E1E).
- "Continue with Apple" on the auth pages is disabled with a "Coming soon" badge until Apple
  sign-in ships (#115).
- Rewrote the README with an accurate project overview (#113).

### Fixed
- The homepage Roost logo no longer bounces (#114).

## [1.0.0-beta.1] - 2026-07-07

Initial beta release. Roost is a household management app for families, roommates, and
college students, covering chores, grocery lists, calendar, bill splitting, meal
planning, notes, reminders, tasks, and rewards, with per-household premium pricing.

### Added
- Core household features: chores (with day/start-date scheduling, leaderboard, history,
  rewards), grocery lists (multi-list, smart sort, common items, duplicate-item merge),
  calendar (month/agenda, recurring events, RSVP), tasks (subtasks, comments, delegations,
  projects), notes (plain + rich text), reminders (recurring, snooze, due-now surfacing),
  meal planning (planner, meal bank, suggestions + voting), and a rewards system.
- Money module: expense tracking + bill splitting, two-sided settle-up, budgets, savings
  goals, recurring expenses and bills, receipt scanning (premium), and CSV/PDF export.
- Accounts + households: email/password + PIN-only child accounts, guest members, roles
  and per-user permission overrides, multi-household support, and household lifecycle.
- Premium via Stripe, promo codes, an internal admin panel, and a public marketing site.
- A restored Playwright end-to-end test suite and a full manual QA pass across the app.
- A component reference gallery (`docs/design-reference.html`) as the design source of truth.

### Notes
- This is a beta: expect small issues. Fixes are tracked as GitHub issues and land on the
  `dev` branch between releases.

[Unreleased]: https://github.com/Cremacious/roost/compare/v1.0.0-beta.2...HEAD
[1.0.0-beta.2]: https://github.com/Cremacious/roost/compare/v1.0.0-beta.1...v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/Cremacious/roost/releases/tag/v1.0.0-beta.1
