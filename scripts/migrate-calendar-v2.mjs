import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: './apps/web/.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const migrations = [
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS category text`,
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS location text`,
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS notify_member_ids text`,
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS rsvp_enabled boolean NOT NULL DEFAULT false`,
  `ALTER TABLE event_attendees ADD COLUMN IF NOT EXISTS rsvp_status text`,
];

for (const sql of migrations) {
  console.log('Running:', sql);
  await client.query(sql);
  console.log('OK');
}

await client.end();
console.log('Done — calendar v2 columns added.');
