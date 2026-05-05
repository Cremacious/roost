import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

async function main() {
  const sql = neon(process.env.DATABASE_URL!)
  const tables = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `
  console.log('Tables in V2 DB:')
  tables.forEach((t) => console.log(' -', t.tablename))
}

main().catch(console.error)
