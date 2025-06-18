import type {Guild, GuildMember, Message, TextChannel} from "discord.js";
import type {RewardConfig, UserLevelData} from "../types";
import {guildRewards, levels} from "../db";
import {formatString} from "../utils/strings";


/**
 * The level system is based on the scaling function with SCALE = 10:
 * XP for level = (level^2 + level) / 2 * SCALE - (level * SCALE)
 *
 * So the inverse function of this is:
     sqrt(4*xp + 5)
 * level = --------------
 *            sqrt(20)
 */
const getLevel = (xp: number) => Math.round(Math.sqrt(4 * xp + 5) / Math.sqrt(20));


const onCooldown = new Set<string>();
export default {
    name: "messageCreate",
    async execute(message: Message) {
        if (!message.guild || message.author.bot || !message.member) return;
        if (onCooldown.has(message.author.id)) return;
        onCooldown.add(message.author.id); // Add to cooldown

        const words = message.content.split(/\s+/);
        if (words.length >= 5) {
            await this.adjustXp(message.guild, message.channel as TextChannel, message.member, 1)
        }


        await new Promise<void>(resolve => setTimeout(resolve, 5000)); // Simulate cooldown
        onCooldown.delete(message.author.id); // Remove from cooldown
    },

    async adjustXp(guild: Guild, channel: TextChannel, user: GuildMember, amount: number) {
        const guildData = await levels.get(guild.id) as Record<string, UserLevelData> | undefined ?? {};
        if (!guildData[user.id]) guildData[user.id] = {level: 0, xp: 0}; // If user didn't exist
        const userData = guildData[user.id];

        userData.xp = userData.xp + amount; // Add the xp amount
        const originalLevel = userData.level;
        const newLevel = getLevel(userData.xp);
        userData.level = newLevel;
        guildData[user.id] = userData;
        await levels.set(guild.id, guildData);
        if (newLevel === originalLevel) return; // Same level, nothing to do

        // TODO: re-add config system
        // User levelled up, time to do stuff
        // const config = guild.settings.get("levelsConfig", defaultConfig);
        // if (config.levelUpMessage) {
            const message = formatString(`Good job, {{user}}, you are now level {{level}}! You're one step closer to being a Legend!`, {user: user.toString(), level: newLevel});
            // if (config.shouldDM) await user.send(message);
            // else await channel.send(message);
            channel.send(message);
        // }

        // Message handled, time to check for role rewards
        const rewards = await guildRewards.get(guild.id) as RewardConfig[] | undefined ?? [];
        if (!rewards || !rewards.length) return; // Already handled message, if no rewards then nothing to do
        const availableRewards = rewards.filter(r => r.level <= newLevel).sort((a, b) => {
            if (a.level < b.level) return -1;
            if (a.level > b.level) return 1;
            return 0;
        }).reverse();
        const needToCheck = availableRewards.slice(1); // These lower roles need to be scrutinized

        // [top role for level, any below that should not be removed]
        const shouldHave = [availableRewards[0], ...needToCheck.filter(r => !r.shouldRemove)].map(r => r.roleId);

        // [Roles above level (just in case adjusting downwards), any below that *should* be removed]
        const shouldNotHave = [...rewards.filter(r => r.level > newLevel), ...needToCheck.filter(r => r.shouldRemove)].map(r => r.roleId);

        const member = guild.members.cache.get(user.id);
        if (!member) return; // uh oh
        if (shouldNotHave.length) await member.roles.remove(shouldNotHave, "Planum Rewards");
        if (shouldHave.length) await member.roles.add(shouldHave, "Planum Rewards");
    }
};