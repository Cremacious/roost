import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('Adding missing columns...')

  await sql`
    ALTER TABLE households
    ADD COLUMN IF NOT EXISTS stripe_price_id text,
    ADD COLUMN IF NOT EXISTS subscription_upgraded_at timestamp,
    ADD COLUMN IF NOT EXISTS created_by text,
    ADD COLUMN IF NOT EXISTS stats_visibility text
  `

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS venmo_handle text,
    ADD COLUMN IF NOT EXISTS cashapp_handle text
  `

  await sql`
    CREATE TABLE IF NOT EXISTS split_templates (
      id text PRIMARY KEY,
      household_id text NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      created_by text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      method text NOT NULL,
      splits text NOT NULL DEFAULT '[]',
      created_at timestamp NOT NULL DEFAULT now()
    )
  `

  console.log('Done.')
}

main().catch((err) => { console.error(err); process.exit(1) })
