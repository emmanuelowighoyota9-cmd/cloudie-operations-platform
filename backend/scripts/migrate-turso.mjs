#!/usr/bin/env node
// Applies the Turso migrations from the command line.
//
// The logic lives in backend/turso-migrations.mjs so this CLI and the API's
// auto-migrate step can never disagree about what "applied" means.
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { applyMigrations, discoverMigrations } from "../turso-migrations.mjs";

const migrationsDir = resolve(import.meta.dirname, "../../migrations/turso");
const url = process.env.TEST_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
const authToken = process.env.TEST_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
const dryRun = process.argv.includes("--dry-run");

const migrations = discoverMigrations(migrationsDir);
if (!migrations.length) throw new Error(`No Turso migrations found in ${migrationsDir}`);

if (dryRun && !url) {
  console.log(`[turso:migrate:dry-run] ${migrations.length} migration(s) discovered`);
  for (const migration of migrations) {
    console.log(`  - ${migration.filename} (${migration.checksum.slice(0, 12)}...)`);
  }
  process.exit(0);
}
if (!url) throw new Error("TURSO_DATABASE_URL or TEST_TURSO_DATABASE_URL is required");

const db = createClient({ url, authToken: authToken || undefined });

if (dryRun) {
  await applyMigrations(db, migrations, { log: (line) => console.log(line.replace("[turso:migrate]", "[turso:migrate:dry-run]")) });
  process.exit(0);
}

await applyMigrations(db, migrations, { log: console.log });
console.log("[turso:migrate] Complete");
