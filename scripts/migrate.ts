import path from "path";
import {fileURLToPath} from "url";
import Keyv from "keyv";
import Sqlite from "@keyv/sqlite";
import {guildRewards, levels, stats} from "../src/db";
import type {RewardConfig} from "../src/types";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const remoteSettings = new Keyv(new Sqlite("sqlite://" + path.resolve(__dirname, "..", "remote.sqlite3")), {namespace: "data"});

for await (const [guildId, oldData] of remoteSettings.iterator!(null)) {
    console.log(`Migrating guild ${guildId} with data:`, Object.keys(oldData));

    if (oldData.commandstats) {
        const toCopy = oldData.commandstats;
        delete toCopy["unknown-command"];
        await stats.set(guildId, {commands: toCopy});
        console.log(`Migrated ${Object.keys(toCopy).length} command stats for guild ${guildId}`);
    }

    if (oldData.levels) {
        await levels.set(guildId, oldData.levels);
        console.log(`Migrated levels of ${Object.keys(oldData.levels).length} users for guild ${guildId}`);
    }

    if (oldData.levelsConfig) {
        const newRewards = (oldData.levelsConfig.rewards || []).map((reward: {level: number; role: string; shouldRemove: boolean}) => ({
            level: reward.level,
            roleId: reward.role,
            shouldRemove: reward.shouldRemove
        })) as RewardConfig[];
        await guildRewards.set(guildId, newRewards);
        console.log(`Migrated ${newRewards.length} rewards for guild ${guildId}`);

        const leftover = oldData.levelsConfig;
        delete leftover.rewards;
        console.log(`Leftover config for guild ${guildId}:`, leftover);
    }
}

