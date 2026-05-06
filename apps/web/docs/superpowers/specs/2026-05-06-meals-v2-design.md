# Meals Feature v2 — Design Spec

**Date:** 2026-05-06
**Status:** Approved
**Section color:** `#F97316` / dark `#C4581A`

---

## Overview

Six targeted improvements to the meals feature:

1. Progressive recipe form (ingredients with optional qty/unit, numbered steps)
2. Planner quick-add opt-in to save to meal bank (off by default)
3. Meal bank `+` button opens a focused date/slot picker for that specific meal
4. Suggestion form gets a real date input instead of hardcoded 7-day pills
5. Edit meal form uses the same rich recipe form
6. Grocery push from meal bank cards opens a list picker with per-ingredient selection

---

## Section 1 — Data Model

### Schema changes (`src/db/schema/meals.ts`)

**New column: `instructions`**
```ts
instructions: text('instructions')  // nullable, JSON array of step strings
// e.g. '["Preheat oven to 375F","Mix dry ingredients","Bake 25 minutes"]'
```

**New column: `saved_to_bank`**
```ts
savedToBank: boolean('saved_to_bank').notNull().default(true)
```
- `true` (default): meal appears in the Meal Bank tab
- `false`: created by planner quick-add without opting in to the bank; hidden from the bank query but still referenced by planner slots

### Ingredient storage format

`meals.ingredients` changes from a flat string array to a structured object array. Both `meals.ingredients` and `mealSuggestions.ingredients` use this format:

```ts
type IngredientItem = {
  name: string
  quantity?: string  // e.g. "2", "1/2"
  unit?: string      // e.g. "cups", "tbsp", "g"
}
// Stored as: JSON.stringify(IngredientItem[])
```

**Backward compatibility:** A `parseIngredients(raw: string): IngredientItem[]` helper deserializes both old format (`string[]`) and new format (`IngredientItem[]`). Old plain strings are wrapped as `{ name: string }` on read. No data migration required.

`mealSuggestions.instructions` is NOT added — suggestions stay lightweight. Recipe depth lives only in the bank.

### Migration

One `db:push` covers both new columns. Run at the start of implementation.

---

## Section 2 — RecipeEditor Component

**File:** `src/components/meals/RecipeEditor.tsx`

### Props

```ts
interface RecipeEditorProps {
  ingredients: IngredientItem[]
  steps: string[]
  onChange: (ingredients: IngredientItem[], steps: string[]) => void
  color?: string  // section color for active states, defaults to #F97316
}
```

### Simple mode (default)

- One text input per ingredient, value = `item.name`
- `+ Add ingredient` dashed row appends a new empty item
- Each row has an `×` remove button (right side)
- No qty/unit fields visible

### Expanded mode

Toggled by a "Add recipe details" switch below the ingredient list (orange toggle, off by default).

When enabled:
- Each ingredient row gains two prepended fields:
  - **Quantity:** short text input (~56px), e.g. "2", "1/2"
  - **Unit:** select element (~80px): `cups | tbsp | tsp | oz | g | lbs | ml | L | whole | to taste | pinch`
  - **Name:** existing text input (flex: 1)
  - **Remove:** `×` button
- **Steps section** appears below ingredients:
  - Numbered orange circles (section color) as step indicators
  - One text input per step
  - `+ Add step` dashed row
  - `×` remove per step

### State rules

- Toggle off preserves all structured data — qty/unit stay on `IngredientItem` objects, just hidden
- Toggle on: existing name-only items get `quantity: undefined, unit: undefined` — no data loss
- Component is fully controlled (stateless) — parent owns `ingredients` and `steps`

### Usage

Used in:
- `MealSheet` (create and edit bank meals)
- `SuggestionFormSheet` (ingredients only, steps not shown for suggestions)

---

## Section 3 — MealSheet, SlotPickerSheet, and SuggestionFormSheet

### MealSheet

- Replace current ingredients `<textarea>` with `<RecipeEditor>`
- Add `steps: string[]` state alongside existing `ingredients` state
- On save: `ingredients` serialized via `JSON.stringify(IngredientItem[])`, `steps` serialized via `JSON.stringify(string[])` and sent as `instructions`
- API `PATCH /api/meals/[id]` gains `instructions` field
- No other structural changes (name, category, prepTime, description stay)

### SlotPickerSheet — quick-add mode

**New toggle: "Save to meal bank"**
- Renders below the meal name input in quick-add mode
- Off by default
- When off: POST to `/api/meals` with `{ name, ingredients: [], savedToBank: false }` then POST to `/api/meals/planner` with the returned `mealId`
- When on: same flow but `savedToBank: true`, meal appears in the bank

### SlotPickerSheet — bank card `+` button

New prop: `preSelectedMeal?: { id: string; name: string }`

When set:
- Sheet skips the menu mode entirely
- Opens directly in a **date+slot picker** view:
  - Meal name shown at top (read-only, muted)
  - 7-day date strip (Mon–Sun of current week) with prev/next week arrows
  - Slot type pills: Breakfast / Lunch / Dinner / Snack
  - "Add to plan" orange slab button
- Tapping a day highlights it; tapping a slot pill selects it; both required before "Add to plan" enables
- On confirm: calls existing planner POST with `{ mealId: preSelectedMeal.id, slotDate, slotType }`

The `+` button on each bank card passes `{ id: m.id, name: m.name }` as `preSelectedMeal` and opens `SlotPickerSheet`.

### SuggestionFormSheet — date picker

Replace the hardcoded 7-day preset pills with:
- Three quick-select pills: **Today**, **Tomorrow**, **This weekend** (nearest Sat)
- Below the pills: `<input type="date" min={today}>` — native date picker, always visible
- Selecting a quick pill populates the date input; editing the date input deselects the pill
- Ingredient section uses `<RecipeEditor>` (simple mode, no steps)

---

## Section 4 — Grocery Push Flow

### New component: `GroceryPushSheet`

**File:** `src/components/meals/GroceryPushSheet.tsx`

```ts
interface GroceryPushSheetProps {
  open: boolean
  onClose: () => void
  mealName: string
  ingredients: IngredientItem[]
  mealId: string
}
```

**Behavior:**
- Sheet title: meal name
- All ingredients listed as checkboxes, all checked by default
- User can uncheck any ingredient to exclude it from the push
- **List selector (premium only):** pill buttons, one per list, default list pre-selected. Fetches via `useQuery(['grocery-lists'])` — reuses cached data from the grocery page. Hidden for free tier (auto-targets default list).
- "Add X ingredients" green slab button (`#22C55E / #159040`) — disabled when 0 checked
- On confirm: `POST /api/meals/[id]/add-to-grocery` with `{ listId, ingredientNames: string[] }`
- Success toast: "Added X ingredients to [list name]"

**Where it appears:**

1. **Meal bank card:** The grocery cart (`ShoppingCart`) icon opens `GroceryPushSheet` for that meal. Replaces current behavior (silent push to default list).

2. **Suggestion approval:** After admin approves a suggestion ("Add to bank" or "Add to day") and the API call succeeds, the suggestion card expands inline to show: "Add ingredients to grocery list?" with a compact list-selector pill row and a green confirm button. Auto-collapses after the user confirms or dismisses. This is an inline card expansion, not a separate sheet.

### API update: `POST /api/meals/[id]/add-to-grocery`

Updated to accept optional body:
```ts
{
  listId?: string        // defaults to household's default list
  ingredientNames?: string[]  // defaults to all ingredients (backward compat)
}
```

---

## Section 5 — File Map

### New files

| File | Purpose |
|------|---------|
| `src/components/meals/RecipeEditor.tsx` | Controlled recipe editor, simple + expanded modes |
| `src/components/meals/GroceryPushSheet.tsx` | Grocery list picker with ingredient checkboxes |

### Modified files

| File | Changes |
|------|---------|
| `src/db/schema/meals.ts` | Add `instructions` (text), `savedToBank` (boolean default true) |
| `src/app/api/meals/route.ts` | GET: add `WHERE saved_to_bank = true`; POST: accept `savedToBank` param |
| `src/app/api/meals/[id]/route.ts` | PATCH: accept `instructions` field |
| `src/app/api/meals/planner/route.ts` | POST: accept `name` instead of `mealId` (creates `savedToBank=false` meal inline) |
| `src/app/api/meals/[id]/add-to-grocery/route.ts` | Accept `{ listId?, ingredientNames? }` body |
| `src/app/(app)/meals/page.tsx` | All UI changes: RecipeEditor in MealSheet, SlotPickerSheet props, suggestion date input, bank card buttons, GroceryPushSheet wiring |

### Helper

`src/lib/utils/parseIngredients.ts` — `parseIngredients(raw: string): IngredientItem[]` handles both old string-array and new object-array formats.

---

## Implementation Order

1. `db:push` (schema changes)
2. `parseIngredients` helper
3. `RecipeEditor` component
4. `GroceryPushSheet` component
5. API route updates (meals GET/POST, planner POST, add-to-grocery)
6. `MealSheet` wiring
7. `SlotPickerSheet` changes (bank toggle + preSelectedMeal mode)
8. `SuggestionFormSheet` date picker + RecipeEditor
9. Bank card button wiring + suggestion approval inline expansion
