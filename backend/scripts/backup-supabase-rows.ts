import "dotenv/config";

import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";

import pg from "pg";

const { Pool } = pg;

type Args = {
  approved: boolean;
  outDir: string;
  schemas: string[];
  batchSize: number;
};

type ColumnInfo = {
  name: string;
  dataType: string;
  isNullable: boolean;
};

type TableInfo = {
  schema: string;
  table: string;
  estimatedBytes: number;
  rowEstimate: number;
};

type TableManifest = TableInfo & {
  file: string;
  rowsExported: number;
  columns: ColumnInfo[];
  primaryKey: string[];
};

const currentDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(currentDir, "..");

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    approved: false,
    outDir: "",
    schemas: ["public"],
    batchSize: 1000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (key === "--i-understand-full-row-backup") {
      args.approved = true;
      continue;
    }

    if (!key.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`${key} requires a value.`);
    }
    index += 1;

    if (key === "--out-dir") args.outDir = value;
    else if (key === "--schemas") args.schemas = parseList(value);
    else if (key === "--batch-size") args.batchSize = Number(value);
    else throw new Error(`Unknown argument: ${key}`);
  }

  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 10000) {
    throw new Error("--batch-size must be an integer between 1 and 10000.");
  }

  return args;
}

function quoteIdent(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function makeSafeFileName(schema: string, table: string) {
  return `${schema}.${table}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

async function writeLine(stream: NodeJS.WritableStream, line: string) {
  if (!stream.write(`${line}\n`)) {
    await once(stream, "drain");
  }
}

async function listTables(client: pg.PoolClient, schemas: string[]): Promise<TableInfo[]> {
  const result = await client.query<TableInfo>(
    `
    select
      ns.nspname as "schema",
      cls.relname as "table",
      pg_total_relation_size(cls.oid)::bigint as "estimatedBytes",
      greatest(cls.reltuples::bigint, 0)::bigint as "rowEstimate"
    from pg_class cls
    join pg_namespace ns on ns.oid = cls.relnamespace
    where cls.relkind in ('r', 'p')
    and ns.nspname = any($1::text[])
    order by ns.nspname, cls.relname
    `,
    [schemas],
  );
  return result.rows.map((row) => ({
    ...row,
    estimatedBytes: Number(row.estimatedBytes),
    rowEstimate: Number(row.rowEstimate),
  }));
}

async function listColumns(client: pg.PoolClient, table: TableInfo): Promise<ColumnInfo[]> {
  const result = await client.query<ColumnInfo>(
    `
    select
      column_name as "name",
      data_type as "dataType",
      (is_nullable = 'YES') as "isNullable"
    from information_schema.columns
    where table_schema = $1
    and table_name = $2
    order by ordinal_position
    `,
    [table.schema, table.table],
  );
  return result.rows;
}

async function listPrimaryKey(client: pg.PoolClient, table: TableInfo): Promise<string[]> {
  const result = await client.query<{ columnName: string }>(
    `
    select a.attname as "columnName"
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = ($1 || '.' || quote_ident($2))::regclass
    and i.indisprimary
    order by array_position(i.indkey, a.attnum)
    `,
    [table.schema, table.table],
  );
  return result.rows.map((row) => row.columnName);
}

async function exportTable(client: pg.PoolClient, table: TableInfo, outDir: string, batchSize: number): Promise<TableManifest> {
  const fileName = `${makeSafeFileName(table.schema, table.table)}.jsonl`;
  const filePath = resolve(outDir, fileName);
  const stream = createWriteStream(filePath, { encoding: "utf-8", flags: "w" });
  const columns = await listColumns(client, table);
  const primaryKey = await listPrimaryKey(client, table);
  const qualified = `${quoteIdent(table.schema)}.${quoteIdent(table.table)}`;
  const orderBy =
    primaryKey.length > 0
      ? primaryKey.map((column) => `t.${quoteIdent(column)}`).join(", ")
      : "t.ctid";
  let rowsExported = 0;
  let offset = 0;

  try {
    for (;;) {
      const result = await client.query<{ row: unknown }>(
        `
        select to_jsonb(t) as row
        from ${qualified} t
        order by ${orderBy}
        limit $1 offset $2
        `,
        [batchSize, offset],
      );

      if (result.rows.length === 0) {
        break;
      }

      for (const item of result.rows) {
        await writeLine(stream, JSON.stringify(item.row));
      }

      rowsExported += result.rows.length;
      offset += result.rows.length;
    }
  } finally {
    stream.end();
    await once(stream, "finish");
  }

  return {
    ...table,
    file: relative(outDir, filePath),
    rowsExported,
    columns,
    primaryKey,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.approved) {
    throw new Error("Refusing full row backup without --i-understand-full-row-backup.");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const backupRoot = args.outDir
    ? resolve(args.outDir)
    : resolve(backendRoot, "backups", `supabase-row-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  await mkdir(backupRoot, { recursive: true });

  const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  const startedAt = new Date().toISOString();
  const tables: TableManifest[] = [];

  try {
    const source = await client.query<{
      databaseName: string;
      serverVersion: string;
      currentUser: string;
    }>(
      `
      select
        current_database() as "databaseName",
        current_setting('server_version') as "serverVersion",
        current_user as "currentUser"
      `,
    );
    const tableInfos = await listTables(client, args.schemas);

    for (const table of tableInfos) {
      console.log(`Exporting ${table.schema}.${table.table}`);
      tables.push(await exportTable(client, table, backupRoot, args.batchSize));
    }

    const finishedAt = new Date().toISOString();
    const manifest = {
      backupType: "supabase_public_row_jsonl",
      warning: "This backup contains full row data for the selected schemas. Protect it as sensitive local data.",
      startedAt,
      finishedAt,
      schemas: args.schemas,
      source: {
        databaseName: source.rows[0].databaseName,
        serverVersion: source.rows[0].serverVersion,
        currentUser: source.rows[0].currentUser,
      },
      tables,
    };

    await writeFile(resolve(backupRoot, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
    await writeFile(
      resolve(backupRoot, "RESTORE_NOTES.md"),
      [
        "# Supabase Row Backup",
        "",
        "This directory contains JSONL row exports for the selected schemas.",
        "",
        "- It is a full row-data backup, not a `pg_dump` schema restore point.",
        "- Use the repository SQL migrations to recreate schema before row restoration.",
        "- Each table file is listed in `manifest.json` with columns and primary key metadata.",
        "- Protect these files as sensitive local data.",
        "",
      ].join("\n"),
      "utf-8",
    );

    console.log(
      JSON.stringify(
        {
          backupRoot,
          tables: tables.length,
          rowsExported: tables.reduce((sum, table) => sum + table.rowsExported, 0),
          manifest: resolve(backupRoot, "manifest.json"),
        },
        null,
        2,
      ),
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.stack || error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
