const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "resetall",
            group: "levels",
            memberName: "resetall",
            description: "Resets all members back to nothing.",
            guildOnly: true,
            userPermissions: ["MANAGE_ROLES"]
        });
    }

    async run(msg) {
	await msg.guild.settings.set("levels", {});
    }
};
