// Single source of truth for test-account detection in the admin panel.
//
// Overview, Users, and Households all import from here so the "hide test
// accounts" toggle stays consistent across every surface. Add new seed or E2E
// names here and all three pick them up automatically.
//
// Every value below is a hardcoded constant (no user input), so the generated
// fragments are safe to hand to Drizzle's sql.raw(). Emails are wrapped in
// COALESCE so PIN-only child accounts (null email) never poison the NOT(...)
// wrapper and get hidden by mistake.

const TEST_EMAIL_PATTERNS = ['%@example.com', '%@roost.test', '%test%']

// Seeded QA accounts (see src/db/seed.ts) plus legacy Playwright names. Emails
// on jordan/taylor/riley already match @roost.test; the child accounts
// (Premium Kid) have a placeholder internal email, so they are matched by name.
const TEST_USER_NAMES = [
  'Free Admin',
  'Premium Admin',
  'Test Member',
  'Test Child',
  'Premium Kid',
  'Jordan Lee',
  'Taylor Kim',
  'Riley Guest',
  // legacy Playwright accounts
  'Nav User',
  'Premium User',
  'Onboarding User',
  'Grocery User',
  'Chores User',
  'Auth Test User',
]

// Seeded households (see src/db/seed.ts). ILIKE makes these case-insensitive.
const TEST_HOUSEHOLD_NAMES = [
  'Roost Free House',
  'Roost Premium House',
  'Roost Second House',
  'My Test House',
]

function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * SQL boolean: true when the user row (aliased `alias`) is a test account.
 * COALESCE(email, '') keeps a null email from turning the whole OR chain into
 * NULL, which would otherwise drop legitimate PIN-only children from results.
 */
export function isTestUserSql(alias = 'u'): string {
  const emailClauses = TEST_EMAIL_PATTERNS.map(
    (p) => `COALESCE(${alias}.email, '') ILIKE ${quote(p)}`,
  )
  const nameClause = `${alias}.name IN (${TEST_USER_NAMES.map(quote).join(', ')})`
  return `(${[...emailClauses, nameClause].join(' OR ')})`
}

/** SQL boolean: true when the household row (aliased `alias`) is a test household. */
export function isTestHouseholdSql(alias = 'h'): string {
  const clauses = [
    `${alias}.name ILIKE '%test%'`,
    `${alias}.name IN (${TEST_HOUSEHOLD_NAMES.map(quote).join(', ')})`,
  ]
  return `(${clauses.join(' OR ')})`
}

// Ready-to-append AND fragments for the sql.raw() WHERE builders in the
// stats route (which concatenates raw SQL strings).
export const EXCLUDE_TEST_USERS_SQL = ` AND NOT ${isTestUserSql('u')}`
export const EXCLUDE_TEST_HOUSEHOLDS_SQL = ` AND NOT ${isTestHouseholdSql('h')}`
