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
            name: "addreward",
            aliases: ["arr"],
            group: "levels",
            memberName: "addreward",
            description: "Sets up a role to be given as a reward",
            details: "This command has another option called `shouldRemove` that can be disabled if users should keep all previous rewards.",
            guildOnly: true,
            userPermissions: ["MANAGE_ROLES"],
            args: [
                {
                    key: "role",
                    type: "role",
                    prompt: "What role should be given?"
                },
                {
                    key: "level",
                    prompt: "At what level should this role be given?",
                    type: "integer"
                },
                {
                    key: "shouldRemove",
                    prompt: "Should this role be removed when they reach the next tier?",
                    type: "boolean",
                    defaultValue: true
                }
            ]
        });
    }
    
    async run(msg, {role, level, shouldRemove}) {
        const config = msg.guild.settings.get("levelsConfig", defaultConfig);
        const roleUsed = config.rewards.find(r => r.role == role.id);
        if (roleUsed) return await msg.failure(`<@&${role.id}> is already set as a reward.`);
        config.rewards.push({role: role.id, level, shouldRemove});
        await msg.guild.settings.set("levelsConfig", config);
        await msg.success(`<@&${role.id}> set to be given at level ${level}!`);
    }
};