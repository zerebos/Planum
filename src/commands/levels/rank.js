const {MessageEmbed} = require("discord.js");
const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "rank",
            group: "levels",
            memberName: "rank",
            description: "View a users rank.",
            guildOnly: true,
            argsPromptLimit: 0,
            args: [
                {
                    key: "member",
                    type: "member",
                    prompt: "Whose rank do you want to know?",
                    defaultValue: msg => msg.member
                }
            ]
        });
    }
    
    async run(msg, {member}) {
        const levels = msg.guild.settings.get("levels", {});
        // If user didn't exist
        if (!levels[member.id]) {
            levels[member.id] = {level: 0, xp: 0};
            await msg.guild.settings.set("levels", levels);
        }
        const userData = levels[member.id];
        const users = Object.entries(levels).sort((a, b) => {
            if (a[1].xp < b[1].xp) return -1;
            if (a[1].xp > b[1].xp) return 1;
            return 0;
        }).reverse();

        const infoEmbed = new MessageEmbed();
        infoEmbed.setAuthor(member.user.tag, member.user.displayAvatarURL());
        infoEmbed.setColor(member.displayColor);

        infoEmbed.addField("Rank", users.findIndex(entry => entry[0] == member.id) + 1, true);
        infoEmbed.addField("Level", userData.level, true);
        infoEmbed.addField("Xp", userData.xp, true);

        if (member.user.avatar) infoEmbed.setThumbnail(member.user.displayAvatarURL({size: 256}));
        await msg.embed(infoEmbed);
    }
};