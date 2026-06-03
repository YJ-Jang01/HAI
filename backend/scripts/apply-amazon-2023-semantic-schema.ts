import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import pg from "pg";

const { Pool } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }
  const sql = await readFile(resolve("drizzle", "0010_amazon2023_semantic_attributes.sql"), "utf8");
  const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  });
  try {
    await pool.query(sql);
    console.log("Applied drizzle/0010_amazon2023_semantic_attributes.sql");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
