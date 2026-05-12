import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema.js";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required. Copy backend/.env.example to backend/.env and set Supabase Postgres URI.");
}

const ssl =
  process.env.DATABASE_SSL === "false"
    ? false
    : {
        rejectUnauthorized: false,
      };

export const pool = new Pool({
  connectionString,
  ssl,
});

export const db = drizzle({ client: pool, schema });
