import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('Adding missing columns to households table...')

  await sql`
    ALTER TABLE households
    ADD COLUMN IF NOT EXISTS stripe_price_id text,
    ADD COLUMN IF NOT EXISTS subscription_upgraded_at timestamp,
    ADD COLUMN IF NOT EXISTS created_by text,
    ADD COLUMN IF NOT EXISTS stats_visibility text
  `

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
