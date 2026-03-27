import type {Guild, GuildMember, Message, TextChannel} from "discord.js";
import {getGuildRewards, getUserLevel, upsertUserLevel} from "../db";
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
        onCooldown.add(message.author.id);

        const words = message.content.split(/\s+/);
        if (words.length >= 5) {
            await this.adjustXp(message.guild, message.channel as TextChannel, message.member, 1);
        }

        await new Promise<void>(resolve => setTimeout(resolve, 5000));
        onCooldown.delete(message.author.id);
    },

    async adjustXp(guild: Guild, channel: TextChannel, user: GuildMember, amount: number) {
        const existing   = getUserLevel(guild.id, user.id);
        const currentXp  = existing?.xp ?? 0;
        const originalLevel = existing?.level ?? 0;

        const newXp    = currentXp + amount;
        const newLevel = getLevel(newXp);
        upsertUserLevel(guild.id, user.id, newXp, newLevel);

        if (newLevel === originalLevel) return;

        // TODO: re-add per-guild config (levelUpMessage, shouldDm)
        const msgText = formatString(
            `Good job, {{user}}, you are now level {{level}}! You're one step closer to being a Legend!`,
            {user: user.toString(), level: newLevel}
        );
        channel.send(msgText);

        const rewards = getGuildRewards(guild.id);
        if (!rewards.length) return;

        const availableRewards = rewards
            .filter(r => r.level <= newLevel)
            .sort((a, b) => b.level - a.level);
        const needToCheck = availableRewards.slice(1);

        // Top reward + any lower rewards that should NOT be removed
        const shouldHave = [availableRewards[0], ...needToCheck.filter(r => !r.removePrevious)].map(r => r.roleId);
        // Rewards above the current level + lower rewards that SHOULD be removed
        const shouldNotHave = [...rewards.filter(r => r.level > newLevel), ...needToCheck.filter(r => r.removePrevious)].map(r => r.roleId);

        const member = guild.members.cache.get(user.id);
        if (!member) return;
        if (shouldNotHave.length) await member.roles.remove(shouldNotHave, "Planum Rewards");
        if (shouldHave.length)    await member.roles.add(shouldHave,    "Planum Rewards");
    }
};