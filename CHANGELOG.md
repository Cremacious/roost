# Changelog

All notable changes to Roost are recorded here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
with pre-release tags during beta.

## Versioning + release process

- Day to day work lands on a single shared working branch (`dev`). Small fixes and
  minor changes accumulate there.
- When that branch has done its job (a coherent batch of updates), it is merged into
  `main`, the version is bumped, a tagged GitHub release is cut, this changelog is
  updated, and the branch is deleted. A fresh `dev` branch starts the next cycle.
- Each merged batch is a version change. During beta the version increments the
  pre-release counter: `1.0.0-beta.1`, `1.0.0-beta.2`, ... up to the `1.0.0` stable
  release. All releases before `1.0.0` are marked as pre-releases on GitHub.
- Entries are grouped under Added / Changed / Fixed / Removed.

## [Unreleased]

Changes on the `dev` branch that have not yet been merged + released go here.

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

[Unreleased]: https://github.com/Cremacious/roost/compare/v1.0.0-beta.1...HEAD
[1.0.0-beta.1]: https://github.com/Cremacious/roost/releases/tag/v1.0.0-beta.1
