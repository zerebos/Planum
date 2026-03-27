import {integer, text, sqliteTable, uniqueIndex, index} from "drizzle-orm/sqlite-core";

/**
 * One row per user per guild.
 * Indexed on (guild_id, xp) so leaderboard queries and rank lookups
 * are O(log n) rather than loading the entire guild blob.
 */
export const userLevels = sqliteTable(
    "user_levels",
    {
        id:        integer("id").primaryKey({autoIncrement: true}),
        guildId:   text("guild_id").notNull(),
        userId:    text("user_id").notNull(),
        xp:        integer("xp").notNull().default(0),
        level:     integer("level").notNull().default(0),
        updatedAt: integer("updated_at").notNull(),
    },
    (t) => [
        uniqueIndex("user_levels_guild_user_idx").on(t.guildId, t.userId),
        index("user_levels_guild_xp_idx").on(t.guildId, t.xp),
    ]
);

/**
 * One row per role reward per guild.
 * Replaces the old pattern of storing an entire RewardConfig[] JSON array
 * keyed by guildId.
 */
export const guildRewards = sqliteTable(
    "guild_rewards",
    {
        id:             integer("id").primaryKey({autoIncrement: true}),
        guildId:        text("guild_id").notNull(),
        level:          integer("level").notNull(),
        roleId:         text("role_id").notNull(),
        removePrevious: integer("remove_previous", {mode: "boolean"}).notNull().default(true),
    },
    (t) => [
        uniqueIndex("guild_rewards_guild_role_idx").on(t.guildId, t.roleId),
        index("guild_rewards_guild_idx").on(t.guildId),
    ]
);

/**
 * Per-guild configuration.  Stored with proper columns so individual
 * settings can be queried/updated without deserialising a JSON blob.
 */
export const guildConfigs = sqliteTable("guild_configs", {
    guildId:         text("guild_id").primaryKey(),
    ignoredRoles:    text("ignored_roles").notNull().default("[]"),
    ignoredChannels: text("ignored_channels").notNull().default("[]"),
    levelUpMessage:  text("level_up_message"),
    shouldDm:        integer("should_dm", {mode: "boolean"}).notNull().default(false),
});

/**
 * One row per command per context (guild id or bot user id for DMs).
 * Enables efficient aggregation via SQL SUM without loading all guilds.
 */
export const commandStats = sqliteTable(
    "command_stats",
    {
        id:          integer("id").primaryKey({autoIncrement: true}),
        contextId:   text("context_id").notNull(),
        commandName: text("command_name").notNull(),
        count:       integer("count").notNull().default(0),
    },
    (t) => [
        uniqueIndex("command_stats_context_cmd_idx").on(t.contextId, t.commandName),
        index("command_stats_context_idx").on(t.contextId),
    ]
);
