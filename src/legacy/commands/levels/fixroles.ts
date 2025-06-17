const {Command} = require("discord.js-commando");

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

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "fixroles",
            group: "levels",
            memberName: "fixroles",
            description: "Fixes all roles of members. Useful after adding new rewards.",
            guildOnly: true,
            userPermissions: ["MANAGE_ROLES"]
        });
    }

    async run(msg) {
    const members = msg.guild.members.cache;
        await msg.info(`Going to fix the role rewards of ${members.size} members. This will take approximately ${humanReadableUptime(members.size * 500)}. Please be patient.`);
        const start = Date.now();
        for (const [, member] of members) {
            const name = member.nickname || member.user.username;
            try {await this.checkRoles(msg.guild, member);}
            catch (err) {await msg.failure(`Could not fix roles for \`${name}\`.`);}
        }
        const finish = Date.now();
        await msg.success(`Finished fixing ${members.size} nicknames. It took ${humanReadableUptime(finish - start)}.`); 
   }

    async checkRoles(guild, member) {
	const levels = guild.settings.get("levels", {});
        if (!levels[member.id]) return; // If user didn't exist, no need to fix
	const userData = levels[member.id];
        const userLevel = userData.level;

	const config = guild.settings.get("levelsConfig", defaultConfig);
        const rewards = config.rewards;
        if (!rewards || !rewards.length) return; // Already handled message, if no rewards then nothing to do
        const availableRewards = config.rewards.filter(r => r.level <= userLevel).sort((a, b) => {
            if (a.level < b.level) return -1;
            if (a.level > b.level) return 1;
            return 0;
        }).reverse();
        const needToCheck = availableRewards.slice(1); // These lower roles need to be scrutinized

        // [top role for level, any below that should not be removed]
        const shouldHave = [availableRewards[0], ...needToCheck.filter(r => !r.shouldRemove)].map(r => r.role); 

        // [Roles above level (just in case adjusting downwards), any below that *should* be removed]
        const shouldNotHave = [...rewards.filter(r => r.level > userLevel), ...needToCheck.filter(r => r.shouldRemove)].map(r => r.role);
        
        if (shouldNotHave.length) await member.roles.remove(shouldNotHave, "Planum Rewards");
        if (shouldHave.length) await member.roles.add(shouldHave, "Planum Rewards");
    }
};

const msInSecond = 1000;
const msInMinute = msInSecond * 60;
const msInHour = msInMinute * 60;
const msInDay = msInHour * 24;

function humanReadableUptime(uptime) {
    let remainder = uptime;
    const days = Math.floor(uptime / msInDay);
    remainder = remainder - (days * msInDay);
    const hours = Math.floor(remainder / msInHour);
    remainder = remainder - (hours * msInHour);
    const minutes = Math.floor(remainder / msInMinute);
    remainder = remainder - (minutes * msInMinute);
    const seconds = Math.floor(remainder / msInSecond);

    let humanReadable = `${seconds}s`;
    if (minutes) humanReadable = `${minutes}m ${humanReadable}`;
    if (hours) humanReadable = `${hours}h ${humanReadable}`;
    if (days) humanReadable = `${days}d ${humanReadable}`;
    return humanReadable;
}
