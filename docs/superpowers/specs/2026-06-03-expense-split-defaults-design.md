# Expense Split Member Selection Defaults

**Date:** 2026-06-03  
**Status:** Approved

## Problem

When a user switches to any split mode (Equal, Custom $, Percent, Shares), all non-payer members are pre-selected. In households of 3 or more this forces the user to deselect everyone they do not want to charge before they can target the specific people who owe them money. The flow feels broken and requires unnecessary tapping.

## Goal

Start each split with a sensible default that lets the user target exactly who owes them money, with minimal taps.

## Design

### Rule

| Non-payer count | Default selection |
|---|---|
| 1 (2-person household) | Pre-select that person and pre-populate their split value |
| 2+ (3+ person household) | Empty selection, no values pre-populated |

### Scope

Four init functions in `src/components/money/ExpenseSheet.tsx`:

- `initEqualSplits` — controls `equalSelectedIds`
- `initCustomSplits` — controls `customSelectedIds` + `customSplits`
- `initPercentSplits` — controls `percentSelectedIds` + `percentSplits`
- `initShareSplits` — controls `shareSelectedIds` + `shareSplits`

Each function replaces `new Set(nonPayer.map(m => m.id))` with `new Set(nonPayer.length === 1 ? nonPayer.map(m => m.id) : [])`. For Custom/Percent/Shares, the value arrays are also conditionally populated only in the 2-person case.

`handlePaidByChange` already re-runs the active init on payer change, so the rule applies there automatically.

### Out of scope

- Payer-only ("Just me") split: no member selection exists
- Receipt scan flow: grid assigns splits from line items, not affected
- Saved templates: applying a template replaces the selection entirely

## No new state, APIs, or components required.
