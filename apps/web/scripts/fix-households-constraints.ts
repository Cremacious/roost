import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('Fixing households table constraints...')

  // Drop NOT NULL on legacy columns that V2 no longer uses
  await sql`ALTER TABLE households ALTER COLUMN admin_id DROP NOT NULL`

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
