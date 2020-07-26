const {Command} = require("discord.js-commando");

/**
 * Example Reward
 * {
 *     "level": 5,
 *     "role": "35902758023",
 *     "shouldRemove": true
 * }
 *
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
            name: "removereward",
            aliases: ["rrr"],
            group: "levels",
            memberName: "removereward",
            description: "Removes an already setup reward",
            guildOnly: true,
            userPermissions: ["MANAGE_ROLES"],
            args: [
                {
                    key: "role",
                    type: "role",
                    prompt: "What role should be given?"
                }
            ]
        });
    }
    
    async run(msg, {role}) {
        const config = msg.guild.settings.get("levelsConfig", defaultConfig);
        const roleUsed = config.rewards.findIndex(r => r.role == role.id);
        if (roleUsed < 0) return await msg.failure(`<@&${role.id}> has not been setup as a reward.`);
        config.rewards.splice(roleUsed, 1);
        await msg.guild.settings.set("levelsConfig", config);
        await msg.success(`<@&${role.id}> is no longer a reward!`);
    }
};