import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { getDatabaseUrl, validateServerEnv } from "@/lib/env";

validateServerEnv();

const sql = neon(getDatabaseUrl());

export const db = drizzle(sql, { schema });
