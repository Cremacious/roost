import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const envPath = join(__dirname, '..', '.env.local')
try {
  const contents = readFileSync(envPath, 'utf8')
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (key && !process.env[key]) process.env[key] = val
  }
} catch {
  console.error('Could not read .env.local')
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

// Use pg (node-postgres) to run ALTER TABLE statements
const { default: pg } = await import('pg')
const { Pool } = pg

const pool = new Pool({ connectionString: DATABASE_URL })

const migrations = [
  // calendar_events new columns
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS category text`,
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS location text`,
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS notify_member_ids text`,
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS rsvp_enabled boolean NOT NULL DEFAULT false`,

  // event_attendees new column
  `ALTER TABLE event_attendees ADD COLUMN IF NOT EXISTS rsvp_status text`,
]

for (const sql of migrations) {
  try {
    await pool.query(sql)
    console.log('OK:', sql.slice(0, 60))
  } catch (err) {
    console.error('FAILED:', sql.slice(0, 60))
    console.error(err.message)
  }
}

await pool.end()
console.log('Migration complete.')
