/**
 * One-time migration: Keyv SQLite → Drizzle normalized schema
 *
 * Usage:
 *   bun run migrate
 *
 * The script is idempotent — it uses INSERT OR IGNORE (onConflictDoNothing)
 * so it is safe to run multiple times without creating duplicate rows.
 *
 * After verifying the migration succeeded you can remove the old keyv table:
 *   sqlite3 settings.sqlite3 "DROP TABLE IF EXISTS keyv;"
 */
import path from "path";
import {fileURLToPath} from "url";
import {Database} from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "../src/schema.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "..", "settings.sqlite3");
const sqlite  = new Database(dbPath);
sqlite.exec("PRAGMA journal_mode = WAL;");

const db = drizzle(sqlite, {schema});

// Ensure target tables exist before we insert into them.
console.log("Applying schema migrations…");
migrate(db, {migrationsFolder: path.resolve(__dirname, "..", "drizzle")});
console.log("Schema ready.\n");

// ── Read existing Keyv rows ────────────────────────────────────────────────────

interface KeyvRow { key: string; value: string; }

let rows: KeyvRow[];
try {
    rows = sqlite.query<KeyvRow, []>("SELECT key, value FROM keyv").all();
} catch {
    console.log("No 'keyv' table found — nothing to migrate.");
    process.exit(0);
}
console.log(`Found ${rows.length} keyv row(s) to process.\n`);

// ── Types matching the old Keyv JSON structures ────────────────────────────────

interface OldUserLevel { level: number; xp: number; }
interface OldReward    { level: number; roleId: string; shouldRemove: boolean; }
interface OldStats     { commands?: Record<string, number>; }

let statsCount   = 0;
let levelsCount  = 0;
let rewardsCount = 0;

for (const row of rows) {
    // Keyv stores keys as "namespace:actualKey"
    const colonIdx = row.key.indexOf(":");
    if (colonIdx === -1) continue;

    const namespace = row.key.slice(0, colonIdx);
    const key       = row.key.slice(colonIdx + 1);

    let parsed: unknown;
    try {
        // Keyv wraps values: { "value": <actual>, "expires": null }
        const wrapper = JSON.parse(row.value) as {value: unknown};
        parsed = wrapper.value;
    } catch {
        console.warn(`  ⚠  Could not parse row: ${row.key}`);
        continue;
    }

    // ── stats namespace ────────────────────────────────────────────────────────
    if (namespace === "stats" && parsed && typeof parsed === "object") {
        const data = parsed as OldStats;
        if (!data.commands) continue;

        for (const [commandName, count] of Object.entries(data.commands)) {
            if (commandName === "unknown-command") continue;
            try {
                db.insert(schema.commandStats)
                    .values({contextId: key, commandName, count})
                    .onConflictDoNothing()
                    .run();
                statsCount++;
            } catch (e) {
                console.warn(`  ⚠  Skipping stat ${key}/${commandName}:`, e);
            }
        }
    }

    // ── levels namespace ───────────────────────────────────────────────────────
    else if (namespace === "levels" && parsed && typeof parsed === "object") {
        const guildData = parsed as Record<string, OldUserLevel>;

        for (const [userId, userData] of Object.entries(guildData)) {
            if (!userData || typeof userData.xp !== "number") continue;
            try {
                db.insert(schema.userLevels)
                    .values({
                        guildId:   key,
                        userId,
                        xp:        userData.xp,
                        level:     userData.level ?? 0,
                        updatedAt: Date.now(),
                    })
                    .onConflictDoNothing()
                    .run();
                levelsCount++;
            } catch (e) {
                console.warn(`  ⚠  Skipping level ${key}/${userId}:`, e);
            }
        }
    }

    // ── rewards namespace ──────────────────────────────────────────────────────
    else if (namespace === "rewards" && Array.isArray(parsed)) {
        for (const reward of parsed as OldReward[]) {
            if (!reward.roleId || typeof reward.level !== "number") continue;
            try {
                db.insert(schema.guildRewards)
                    .values({
                        guildId:        key,
                        level:          reward.level,
                        roleId:         reward.roleId,
                        removePrevious: reward.shouldRemove ?? true,
                    })
                    .onConflictDoNothing()
                    .run();
                rewardsCount++;
            } catch (e) {
                console.warn(`  ⚠  Skipping reward ${key}/${reward.roleId}:`, e);
            }
        }
    }
}

console.log("Migration complete:");
console.log(`  Command stat rows : ${statsCount}`);
console.log(`  User level rows   : ${levelsCount}`);
console.log(`  Guild reward rows : ${rewardsCount}`);
console.log("\nOnce verified, drop the legacy table:");
console.log("  sqlite3 settings.sqlite3 \"DROP TABLE IF EXISTS keyv;\"");
