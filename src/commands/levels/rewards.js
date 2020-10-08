const {Constants} = require("discord.js");
const {Command} = require("discord.js-commando");
const Paginator = require("../../paginator");

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
            name: "rewards",
            aliases: ["vrr"],
            group: "levels",
            memberName: "rewards",
            description: "See the levels leaders in the server.",
            guildOnly: true
        });
    }
    
    async run(msg) {
        const config = msg.guild.settings.get("levelsConfig", defaultConfig);
        if (!config.rewards || !config.rewards.length) return await msg.failure("No rewards have been setup.");
        const rewards = config.rewards.sort((a, b) => {
            if (a.level < b.level) return -1;
            if (a.level > b.level) return 1;
            return 0;
        }).reverse().map(r => `<@&${r.role}> at Level ${r.level}`);
        const p = new Paginator(this.client, msg, rewards, 10);
        const title = `Rewards in ${msg.guild.name}`;
        p.embed.setAuthor(title, msg.guild.iconURL());
        p.embed.setColor(Constants.Colors.INFO);
        await p.paginate();
    }
};