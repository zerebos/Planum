const {Command} = require("discord.js-commando");

/**
 * The level system is based on the scaling function with SCALE = 10:
 * XP for level = (level^2 + level) / 2 * SCALE - (level * SCALE)
 * 
 * So the inverse function of this is:
     sqrt(4*xp + 5)
 * level = --------------
 *            sqrt(20)
 */
const getLevel = xp => Math.round(Math.sqrt(4 * xp + 5) / Math.sqrt(20));

/**
 * Example levelsConfig
 * {
 *     "ignoredRoles": ["35325237436"],
 *     "ignoredChannels": ["32873289452"],
 *     "levelUpMessage": "Congratulations {{user}} you've reached level {{level}}",
 *     "shouldDM": false,
 *     "rewards": [
 *         {"level": 5, "role": "35902758023", "shouldRemove": true}
 *     ]
 * }
}
 */

const defaultConfig = {
    ignoredRoles: [],
    ignoredChannels: [],
    levelUpMessage: "Congratulations {{user}} you've reached level {{level}}!",
    shouldDM: false,
    rewards: []
};

const COOLDOWN = 5 * 1000;

const onCooldown = new Set();
module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "xp",
            group: "levels",
            memberName: "xp",
            description: "Gives positive or negative xp to a member",
            guildOnly: true,
            userPermissions: ["MANAGE_ROLES"],
            args: [
                {
                    key: "member",
                    type: "member",
                    prompt: "Whose xp should be adjusted?"
                },
                {
                    key: "amount",
                    prompt: "By how much should their xp change?",
                    type: "integer"
                }
            ]
        });
    }

    async onMessage(message) {
        if (!message.guild) return; // Guilds only
        if (message.author.bot) return; // Ignore bot
        if (!this.client.dispatcher.shouldHandleMessage(message)) return; // Ignore commands or responses to prompts
        if (this.client.dispatcher.parseMessage(message)) return; // Ignore commands or responses to prompts

        if (onCooldown.has(message.author.id)) return; // If on XP cooldown
        onCooldown.add(message.author.id);
        // TODO: add more checks than just length
        const split = message.cleanContent.trim().split(" ");
        if (split.length >= 3) await this.adjustXp(message.guild, message.channel, message.author, 1);
        await new Promise(r => setTimeout(r, COOLDOWN));
        onCooldown.delete(message.author.id); // Remove them from cooldown
    }
    
    async run(msg, {member, amount}) {
        await this.adjustXp(msg.guild, msg.channel, member.user, amount);
        await msg.success(`Successfully adjusted the xp of ${member} by ${amount}`);
    }

    async adjustXp(guild, channel, user, amount) {
        const levels = guild.settings.get("levels", {});
        if (!levels[user.id]) levels[user.id] = {level: 0, xp: 0}; // If user didn't exist
        const userData = levels[user.id];
        userData.xp = userData.xp + amount; // Add the xp amount
        const originalLevel = userData.level;
        const newLevel = getLevel(userData.xp);
        userData.level = newLevel;
        levels[user.id] = userData;
        await guild.settings.set("levels", levels);
        if (newLevel === originalLevel) return; // Same level, nothing to do

        // User levelled up, time to do stuff
        const config = guild.settings.get("levelsConfig", defaultConfig);
        if (config.levelUpMessage) {
            const message = config.levelUpMessage.format({user: user.toString(), level: newLevel});
            if (config.shouldDM) await user.send(message);
            else await channel.send(message);
        }

        // Message handled, time to check for role rewards
        const rewards = config.rewards;
        if (!rewards || !rewards.length) return; // Already handled message, if no rewards then nothing to do
        const availableRewards = config.rewards.filter(r => r.level <= newLevel).sort((a, b) => {
            if (a.level < b.level) return -1;
            if (a.level > b.level) return 1;
            return 0;
        }).reverse();
        const needToCheck = availableRewards.slice(1); // These lower roles need to be scrutinized

        // [top role for level, any below that should not be removed]
        const shouldHave = [availableRewards[0], ...needToCheck.filter(r => !r.shouldRemove)].map(r => r.role); 

        // [Roles above level (just in case adjusting downwards), any below that *should* be removed]
        const shouldNotHave = [...rewards.filter(r => r.level > newLevel), ...needToCheck.filter(r => r.shouldRemove)].map(r => r.role);
        
        const member = guild.members.cache.get(user.id);
        if (!member) return; // uh oh
        if (shouldNotHave.length) await member.roles.remove(shouldNotHave, "Planum Rewards");
        if (shouldHave.length) await member.roles.add(shouldHave, "Planum Rewards");
    }
};