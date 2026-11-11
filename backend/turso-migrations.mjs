// Shared Turso migration logic.
//
// Used by two callers that must not drift apart:
//   - backend/scripts/migrate-turso.mjs  (the `npm run migrate:turso` CLI)
//   - backend/src/auto-migrate.ts        (the API applying its own schema)
//
// Plain ESM so the CLI can run it with `node` and the API bundle can inline it.
// A `client` is anything with `execute(sql)` and `executeMultiple(sql)`; a libSQL
// client satisfies both directly, and the API passes an adapter over its pool.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LEDGER_DDL =
  "CREATE TABLE IF NOT EXISTS _turso_migrations (" +
  "version TEXT PRIMARY KEY, " +
  "filename TEXT NOT NULL UNIQUE, " +
  "checksum TEXT NOT NULL, " +
  "applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)";

export function checksumOf(sql) {
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n").trim()).digest("hex");
}

/** Reads every `NNN_name.sql` migration, in order. */
export function discoverMigrations(directory) {
  return readdirSync(directory)
    .filter((file) => /^\d{3}_.+\.sql$/.test(file))
    .sort()
    .map((filename) => {
      const sql = readFileSync(join(directory, filename), "utf8");
      return { filename, version: filename.slice(0, 3), sql, checksum: checksumOf(sql) };
    });
}

/**
 * Applies every migration the ledger has not recorded yet.
 *
 * Each migration runs in its own transaction together with its ledger row, so a
 * failure leaves neither half applied. Already applied files are skipped, which
 * is what makes it safe to call on every cold start.
 */
export async function applyMigrations(client, migrations, { log = () => {} } = {}) {
  await client.execute(LEDGER_DDL);
  const existing = await client.execute(
    "SELECT version, filename, checksum FROM _turso_migrations ORDER BY version",
  );
  const applied = new Map(existing.rows.map((row) => [String(row.version), row]));
  const newlyApplied = [];

  for (const migration of migrations) {
    const recorded = applied.get(migration.version);
    if (recorded) {
      if (String(recorded.checksum) !== migration.checksum) {
        throw new Error(`Turso migration checksum drift: ${migration.filename}`);
      }
      log(`[turso:migrate] Already applied ${migration.filename}`);
      continue;
    }

    log(`[turso:migrate] Applying ${migration.filename}`);
    const quote = (value) => "'" + String(value).replace(/'/g, "''") + "'";
    const script = [
      "BEGIN IMMEDIATE;",
      migration.sql,
      `INSERT INTO _turso_migrations (version, filename, checksum) VALUES (${quote(migration.version)}, ${quote(migration.filename)}, ${quote(migration.checksum)});`,
      "COMMIT;",
    ].join("\n");

    try {
      // executeMultiple is required because each migration file is a
      // multi-statement script (including SQLite trigger bodies).
      await client.executeMultiple(script);
    } catch (error) {
      await client.execute("ROLLBACK").catch(() => undefined);
      throw error;
    }
    newlyApplied.push(migration.filename);
  }

  return { applied: newlyApplied, alreadyApplied: applied.size };
}
