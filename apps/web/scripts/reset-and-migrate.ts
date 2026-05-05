import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

async function main() {
  const sql = neon(process.env.DATABASE_URL!)

  console.log('Dropping all existing tables...')
  // Drop in reverse dependency order to avoid FK violations
  await sql`DROP SCHEMA public CASCADE`
  await sql`CREATE SCHEMA public`
  await sql`GRANT ALL ON SCHEMA public TO public`
  console.log('Schema reset.')

  const db = drizzle(sql)
  console.log('Running V2 migrations...')
  await migrate(db, { migrationsFolder: resolve(__dirname, '../drizzle') })
  console.log('Migration complete. V2 DB is ready.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Reset failed:', err)
  process.exit(1)
})
