import path from "path";
import {fileURLToPath} from "url";
import Keyv from "keyv";
import Sqlite from "@keyv/sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Single SQLite connection string
const sqliteUri = "sqlite://" + path.resolve(__dirname, "..", "settings.sqlite3");

// Create one Sqlite store instance
const sqliteStore = new Sqlite(sqliteUri);

// Export pre-configured database instances sharing the same store
export const stats = new Keyv(sqliteStore, {namespace: "stats"});
export const levels = new Keyv(sqliteStore, {namespace: "levels"});
export const guildConfigs = new Keyv(sqliteStore, {namespace: "configs"});
export const guildRewards = new Keyv(sqliteStore, {namespace: "rewards"});
