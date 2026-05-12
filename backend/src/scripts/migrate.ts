import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { pool } from "../db/client.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(currentDir, "../..");
const migrationPath = resolve(backendRoot, "drizzle/0000_initial.sql");

async function main() {
  const sql = await readFile(migrationPath, "utf-8");
  await pool.query(sql);
  console.log("Applied migration drizzle/0000_initial.sql");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
