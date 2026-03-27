import path from "path";
import {fileURLToPath} from "url";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {Database} from "bun:sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {and, desc, eq, gt, sql} from "drizzle-orm";
import * as schema from "./schema.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "..", "settings.sqlite3");
const sqlite  = new Database(dbPath);
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, {schema});

// Run pending migrations automatically on startup.
migrate(db, {migrationsFolder: path.resolve(__dirname, "..", "drizzle")});

// ── User Levels ───────────────────────────────────────────────────────────────

export function getUserLevel(guildId: string, userId: string) {
    return db.select()
        .from(schema.userLevels)
        .where(and(eq(schema.userLevels.guildId, guildId), eq(schema.userLevels.userId, userId)))
        .get();
}

export function getGuildLeaderboard(guildId: string) {
    return db.select()
        .from(schema.userLevels)
        .where(and(eq(schema.userLevels.guildId, guildId), gt(schema.userLevels.xp, 0)))
        .orderBy(desc(schema.userLevels.xp))
        .all();
}

/** Returns 1-based rank by counting rows with strictly more XP. */
export function getUserRank(guildId: string, xp: number): number {
    const row = db
        .select({rank: sql<number>`count(*) + 1`})
        .from(schema.userLevels)
        .where(and(eq(schema.userLevels.guildId, guildId), gt(schema.userLevels.xp, xp)))
        .get();
    return row?.rank ?? 1;
}

export function upsertUserLevel(guildId: string, userId: string, xp: number, level: number) {
    return db.insert(schema.userLevels)
        .values({guildId, userId, xp, level, updatedAt: Date.now()})
        .onConflictDoUpdate({
            target: [schema.userLevels.guildId, schema.userLevels.userId],
            set:    {xp, level, updatedAt: Date.now()},
        })
        .run();
}

// ── Guild Rewards ─────────────────────────────────────────────────────────────

export function getGuildRewards(guildId: string) {
    return db.select()
        .from(schema.guildRewards)
        .where(eq(schema.guildRewards.guildId, guildId))
        .orderBy(schema.guildRewards.level)
        .all();
}

/** Throws if the roleId is already configured for this guild. */
export function addGuildReward(guildId: string, level: number, roleId: string, removePrevious: boolean) {
    const existing = db.select()
        .from(schema.guildRewards)
        .where(and(eq(schema.guildRewards.guildId, guildId), eq(schema.guildRewards.roleId, roleId)))
        .get();
    if (existing) throw new Error(`Role ${roleId} is already set as a reward at level ${existing.level}`);
    return db.insert(schema.guildRewards)
        .values({guildId, level, roleId, removePrevious})
        .run();
}

/** Returns true if a row was deleted. */
export function removeGuildReward(guildId: string, roleId: string): boolean {
    const deleted = db.delete(schema.guildRewards)
        .where(and(eq(schema.guildRewards.guildId, guildId), eq(schema.guildRewards.roleId, roleId)))
        .returning({id: schema.guildRewards.id})
        .all();
    return deleted.length > 0;
}

// ── Guild Config ──────────────────────────────────────────────────────────────

export function getGuildConfig(guildId: string) {
    return db.select()
        .from(schema.guildConfigs)
        .where(eq(schema.guildConfigs.guildId, guildId))
        .get();
}

export function upsertGuildConfig(guildId: string, config: Partial<typeof schema.guildConfigs.$inferInsert>) {
    return db.insert(schema.guildConfigs)
        .values({guildId, ...config})
        .onConflictDoUpdate({
            target: schema.guildConfigs.guildId,
            set:    config,
        })
        .run();
}

// ── Command Stats ─────────────────────────────────────────────────────────────

export function incrementCommandStat(contextId: string, commandName: string) {
    return db.insert(schema.commandStats)
        .values({contextId, commandName, count: 1})
        .onConflictDoUpdate({
            target: [schema.commandStats.contextId, schema.commandStats.commandName],
            set:    {count: sql`${schema.commandStats.count} + 1`},
        })
        .run();
}

export function getAllCommandStats() {
    return db
        .select({
            commandName: schema.commandStats.commandName,
            total:       sql<number>`sum(${schema.commandStats.count})`,
        })
        .from(schema.commandStats)
        .groupBy(schema.commandStats.commandName)
        .all();
}

export function getTotalCommandCount(): number {
    const row = db
        .select({total: sql<number>`coalesce(sum(${schema.commandStats.count}), 0)`})
        .from(schema.commandStats)
        .get();
    return row?.total ?? 0;
}

