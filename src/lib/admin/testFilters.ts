// Single source of truth for test account detection patterns.
// Add new patterns here as needed — all routes and pages pick them up automatically.

export const TEST_USER_CONDITIONS = [
  "u.email ILIKE '%@example.com'",
  "u.email ILIKE '%@roost.test'",
  "u.email ILIKE '%test%'",
  "u.name ILIKE '%test%'",
  "u.name ILIKE 'Nav User'",
  "u.name ILIKE 'Premium User'",
  "u.name ILIKE 'Onboarding User'",
  "u.name ILIKE 'Grocery User'",
  "u.name ILIKE 'Chores User'",
  "u.name ILIKE 'Auth Test User'",
  "u.name ILIKE 'Free Admin'",
  "u.name ILIKE 'Premium Admin'",
  "u.name ILIKE 'Test Member'",
  "u.name ILIKE 'Test Child'",
];

export const TEST_HOUSEHOLD_CONDITIONS = [
  "h.name ILIKE '%test%'",
  "h.name ILIKE 'My Test House'",
  "h.name ILIKE 'Roost Free House'",
  "h.name ILIKE 'Roost Premium House'",
];

// Raw SQL fragments for use with Drizzle's sql.raw() in route handlers.
// All values are hardcoded constants — no user input, safe from injection.

export const EXCLUDE_TEST_USERS_SQL = `
  AND NOT (
    u.email ILIKE '%@example.com' OR
    u.email ILIKE '%@roost.test' OR
    u.email ILIKE '%test%' OR
    u.name ILIKE '%test%' OR
    u.name ILIKE 'Nav User' OR
    u.name ILIKE 'Premium User' OR
    u.name ILIKE 'Onboarding User' OR
    u.name ILIKE 'Grocery User' OR
    u.name ILIKE 'Chores User' OR
    u.name ILIKE 'Auth Test User' OR
    u.name ILIKE 'Free Admin' OR
    u.name ILIKE 'Premium Admin' OR
    u.name ILIKE 'Test Member' OR
    u.name ILIKE 'Test Child'
  )
`;

export const EXCLUDE_TEST_HOUSEHOLDS_SQL = `
  AND NOT (
    h.name ILIKE '%test%' OR
    h.name ILIKE 'My Test House' OR
    h.name ILIKE 'Roost Free House' OR
    h.name ILIKE 'Roost Premium House'
  )
`;
