const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "levelmessage",
            aliases: ["slm"],
            group: "levels",
            memberName: "levelmessage",
            description: "Sets up the levelling message",
            details: "In your message, you can use `{{user}}` as a placeholder for the user and `{{level}}` as a placeholder for their new level.",
            examples: ["slm \"Congratulations {{user} you're now **level {{level}}**\" yes"],
            guildOnly: true,
            userPermissions: ["MANAGE_ROLES"],
            args: [
                {
                    key: "message",
                    type: "string",
                    prompt: "What message should be displayed on level up? (or `none` to disable)"
                },
                {
                    key: "shouldDM",
                    type: "boolean",
                    prompt: "Should the message be sent to the user's DM instead of the server?"
                }
            ]
        });
    }
    
    async run(msg, {message, shouldDM}) {
        const config = msg.guild.settings.get("levelsConfig", {});
        if (message === "none") message = "";
        config.levelUpMessage = message;
        config.shouldDM = shouldDM;
        await msg.guild.settings.set("levelsConfig", config);

        const setupMessage = "setup to appear in " + (shouldDM ? "DMs" : "the server");
        await msg.success(`The message has been successfully ${message ? setupMessage : "disabled"}.`);
    }
};