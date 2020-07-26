const {Constants} = require("discord.js");
const {Command} = require("discord.js-commando");
const Paginator = require("../../paginator");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "leaderboard",
            aliases: ["leaders", "rankings", "top"],
            group: "levels",
            memberName: "leaderboard",
            description: "See the levels leaders in the server.",
            guildOnly: true
        });
    }
    
    async run(msg) {
        const levels = msg.guild.settings.get("levels", {});
        const leaders = Object.entries(levels).filter(e => msg.guild.members.cache.get(e[0])).sort((a, b) => {
            if (a[1].xp < b[1].xp) return -1;
            if (a[1].xp > b[1].xp) return 1;
            return 0;
        }).reverse().map(e => `<@!${e[0]}> XP: ${e[1].xp}`);
        const p = new Paginator(this.client, msg, leaders, 10);
        const title = `Rankings in ${msg.guild.name}`;
        p.embed.setAuthor(title, msg.guild.iconURL());
        p.embed.setColor(Constants.Colors.INFO);
        await p.paginate();
    }
};