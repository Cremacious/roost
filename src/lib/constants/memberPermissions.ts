// Guest permission set (single source of truth).
// A guest can view/add expenses, add grocery items, add calendar events, and
// suggest meals. Everything else is off. This is applied when a guest accepts an
// invite and is the fallback used when listing members, so the two can never drift.
export const GUEST_PERMISSIONS = {
  expensesView: true,
  expensesAdd: true,
  choresAdd: false,
  choresEdit: false,
  groceryAdd: true,
  groceryCreateList: false,
  calendarAdd: true,
  calendarEdit: false,
  tasksAdd: false,
  notesAdd: false,
  mealsPlan: false,
  mealsSuggest: true,
} as const;
