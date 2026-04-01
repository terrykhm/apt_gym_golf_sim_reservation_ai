/**
 * SQLite persistence: one row per resident with JSON for slot preferences.
 * (Not normalized with slot_id as a table PK — easier to match the app payload.)
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = process.env.DATA_DIR ?? path.join(__dirname, "..", "data");
const dbPath =
  process.env.DATABASE_PATH ?? path.join(dataDir, "preferences.sqlite");
const legacyJsonPath = path.join(dataDir, "preferences.json");

export interface ResidentPreferences {
  orderedSlotIdsByDate: Record<string, string[]>;
  updatedAt: string;
}

let db: Database.Database | null = null;

function countResidents(database: Database.Database): number {
  return (
    database.prepare("SELECT COUNT(*) AS c FROM resident_preferences").get() as {
      c: number;
    }
  ).c;
}

function openDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(dataDir, { recursive: true });
  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS resident_preferences (
      resident_id TEXT PRIMARY KEY NOT NULL,
      ordered_slot_ids_by_date TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  migratePreferenceSlotsToBlobIfNeeded(database);
  migrateFromJsonIfNeeded(database);

  db = database;
  return database;
}

/** If a DB from the normalized experiment still has `preference_slots`, merge into `resident_preferences` and drop it. */
function migratePreferenceSlotsToBlobIfNeeded(database: Database.Database): void {
  const exists = database
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'preference_slots'`
    )
    .get();
  if (!exists) return;

  try {
    const rows = database
      .prepare(
        `SELECT resident_id, slot_id, priority_order, updated_at
         FROM preference_slots
         ORDER BY resident_id, substr(slot_id, 1, 10) ASC, priority_order ASC`
      )
      .all() as Array<{
      resident_id: string;
      slot_id: string;
      priority_order: number;
      updated_at: string;
    }>;

    const run = database.transaction(() => {
      const byResident = new Map<
        string,
        { ordered: Record<string, string[]>; updatedAt: string }
      >();

      for (const row of rows) {
        let entry = byResident.get(row.resident_id);
        if (!entry) {
          entry = { ordered: {}, updatedAt: row.updated_at };
          byResident.set(row.resident_id, entry);
        }
        const day = row.slot_id.slice(0, 10);
        if (!entry.ordered[day]) entry.ordered[day] = [];
        entry.ordered[day].push(row.slot_id);
        if (row.updated_at > entry.updatedAt) entry.updatedAt = row.updated_at;
      }

      const insert = database.prepare(`
        INSERT INTO resident_preferences (resident_id, ordered_slot_ids_by_date, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(resident_id) DO UPDATE SET
          ordered_slot_ids_by_date = excluded.ordered_slot_ids_by_date,
          updated_at = excluded.updated_at
      `);

      for (const [residentId, { ordered, updatedAt }] of byResident) {
        insert.run(residentId, JSON.stringify(ordered), updatedAt);
      }

      database.exec("DROP TABLE IF EXISTS preference_slots");
    });
    run();
    console.log(
      "Migrated preference_slots back into resident_preferences (JSON per resident) and dropped preference_slots."
    );
  } catch (e) {
    console.warn("Could not migrate preference_slots to resident_preferences:", e);
  }
}

/** One-time import from legacy preferences.json when the table is empty. */
function migrateFromJsonIfNeeded(database: Database.Database): void {
  if (countResidents(database) > 0) return;
  if (!fs.existsSync(legacyJsonPath)) return;

  try {
    const raw = fs.readFileSync(legacyJsonPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return;
    }

    const insert = database.prepare(`
      INSERT INTO resident_preferences (resident_id, ordered_slot_ids_by_date, updated_at)
      VALUES (?, ?, ?)
    `);
    const run = database.transaction(() => {
      for (const [residentId, value] of Object.entries(
        parsed as Record<string, unknown>
      )) {
        if (!value || typeof value !== "object" || Array.isArray(value)) continue;
        const v = value as {
          orderedSlotIdsByDate?: unknown;
          updatedAt?: unknown;
        };
        if (
          !v.orderedSlotIdsByDate ||
          typeof v.orderedSlotIdsByDate !== "object" ||
          Array.isArray(v.orderedSlotIdsByDate)
        ) {
          continue;
        }
        const updatedAt =
          typeof v.updatedAt === "string"
            ? v.updatedAt
            : new Date().toISOString();
        insert.run(
          residentId,
          JSON.stringify(v.orderedSlotIdsByDate),
          updatedAt
        );
      }
    });
    run();
    fs.renameSync(legacyJsonPath, `${legacyJsonPath}.migrated`);
    console.log(
      "Migrated preferences.json to SQLite; old file renamed to preferences.json.migrated"
    );
  } catch (e) {
    console.warn("Could not migrate preferences.json:", e);
  }
}

export function getPreferences(residentId: string): ResidentPreferences | null {
  const database = openDb();
  const row = database
    .prepare(
      `SELECT ordered_slot_ids_by_date, updated_at
       FROM resident_preferences WHERE resident_id = ?`
    )
    .get(residentId) as
    | { ordered_slot_ids_by_date: string; updated_at: string }
    | undefined;
  if (!row) return null;
  try {
    const orderedSlotIdsByDate = JSON.parse(
      row.ordered_slot_ids_by_date
    ) as Record<string, string[]>;
    return {
      orderedSlotIdsByDate,
      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
}

export function setPreferences(
  residentId: string,
  orderedSlotIdsByDate: Record<string, string[]>
): ResidentPreferences {
  const database = openDb();
  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify(orderedSlotIdsByDate);
  database
    .prepare(
      `INSERT INTO resident_preferences (resident_id, ordered_slot_ids_by_date, updated_at)
       VALUES (@residentId, @payload, @updatedAt)
       ON CONFLICT(resident_id) DO UPDATE SET
         ordered_slot_ids_by_date = excluded.ordered_slot_ids_by_date,
         updated_at = excluded.updated_at`
    )
    .run({
      residentId,
      payload,
      updatedAt,
    });
  return { orderedSlotIdsByDate, updatedAt };
}

export function deletePreferences(residentId: string): void {
  const database = openDb();
  database
    .prepare("DELETE FROM resident_preferences WHERE resident_id = ?")
    .run(residentId);
}
