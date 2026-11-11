import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyMigrations, discoverMigrations } from "../turso-migrations.mjs";
import { pool } from "./db.js";

/**
 * Applies pending Turso migrations from inside the running API.
 *
 * A newly created Turso database is empty, and a deployment that has database
 * credentials but no schema answers every auth call with a 500 ("Unable to
 * create account") — which is indistinguishable from a broken app. The CLI
 * (`npm run migrate:turso`) still exists for deliberate, audited runs, but this
 * makes a deployment self-provisioning: the first request after a cold start
 * creates whatever is missing, and the ledger in `_turso_migrations` means that
 * costs one SELECT on every later start.
 *
 * Memoised per process, and never fatal: a failure is logged so the request
 * continues and reports its own error.
 */
let pending: Promise<void> | undefined;

function migrationsDir(): string | null {
  // Vercel runs the function with cwd = the function root and the `includeFiles`
  // glob from vercel.json beside it; a local process runs from the repo root.
  const candidates = [
    join(process.cwd(), "migrations", "turso"),
    resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations", "turso"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

async function runOnce(): Promise<void> {
  if (!process.env.TURSO_DATABASE_URL?.trim()) return;
  if (process.env.CLOUDIE_AUTO_MIGRATE === "0") return;

  const directory = migrationsDir();
  if (!directory) {
    console.warn("[auto-migrate] migrations directory not found; skipping schema check");
    return;
  }

  const migrations = discoverMigrations(directory);
  if (!migrations.length) return;

  const client = {
    execute: (sql: string) => pool.query(sql),
    executeMultiple: (sql: string) => pool.executeScript(sql),
  };

  const result = await applyMigrations(client, migrations);
  if (result.applied.length) {
    console.log(`[auto-migrate] applied ${result.applied.join(", ")}`);
  }
}

export function ensureSchema(): Promise<void> {
  if (!pending) {
    pending = runOnce().catch((error: unknown) => {
      pending = undefined;
      console.error(
        "[auto-migrate] failed:",
        error instanceof Error ? error.message : String(error),
      );
    });
  }
  return pending;
}
