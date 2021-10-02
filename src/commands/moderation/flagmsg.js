const {MessageEmbed, Constants} = require("discord.js");
const {Command} = require("discord.js-commando");
const emojiRegex = require("emoji-regex");
const compiledRegex = emojiRegex();

const dataId = "flagmsg";
const defaultData = {log: "",  channels: {}, emoji: ""};

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "flagmsg",
            group: "moderation",
            memberName: "flagmsg",
            description: "Sets flag message for a channel",
            guildOnly: true,
            userPermissions: ["MANAGE_ROLES"],
            args: [
                {
                    key: "cmd",
                    prompt: "Where action would you like to perform?",
                    type: "string",
                    defaultValue: "status"
                },
                {
                    key: "payload",
                    prompt: "Where value to use?",
                    type: "channel|custom-emoji|default-emoji|string",
                    defaultValue: ""
                }
            ]
        });
    }

    async onMessageReactionAdd(reaction, member) {
        const message = reaction.message;
        if (!message.guild) return; // Guilds only
        if (member.bot) return; // Ignore bot
        // console.log(reaction.emoji.toString(), member.tag);

        const state = await message.guild.settings.get(dataId, defaultData);
        if (!state.channels[message.channel.id]) return;
        if (reaction.emoji.toString() !== state.emoji) return; // check reaction emoji
        if (!message.channel.permissionsFor(member).has(["MANAGE_MESSAGES"])) return await reaction.users.remove(member);
        if (reaction.count == 2) {
            const logChannel = message.guild.channels.cache.get(state.log);
            // await message.channel.send(`Flagged message: ${message.id}`);
            const logEmbed = new MessageEmbed();
            logEmbed.setAuthor(member.tag, member.displayAvatarURL(), message.url);
            logEmbed.setTitle("Message Flagged");
            logEmbed.setDescription(message.toString());
            logEmbed.addField("Flaggers", reaction.users.cache.map(u => `<@!${u.id}>`).join("\n"), false);
            logEmbed.setFooter(`Author: ${member.id} | Message ID: ${message.id}`);
            logEmbed.setTimestamp(Date.now());
            logEmbed.setColor(Constants.Colors.WARNING);
            await logChannel.send(logEmbed);
        }
    }
    
    async run(msg, {cmd, payload}) {
        cmd = cmd.toLowerCase();
        const isChannel = payload.type && payload.type === "text";
        const isEmoji = Object.prototype.hasOwnProperty.call(payload, "animated") || (payload.match && payload.match(compiledRegex) && payload.match(compiledRegex).length);
        const isString = typeof(payload) === "string" && !isEmoji;

        // console.log(payload);

        const state = await msg.guild.settings.get(dataId, defaultData);

        if (cmd === "status" && isChannel) return await msg.info(`I am currently${state.channels[payload.id] ? "" : " not"} monitoring <#${payload.id}>`);
        if (cmd === "enable" || cmd === "disable") {
            if (!isChannel) return await msg.failure("I can only monitor text channels");
            return await this.toggleChannelMonitor(msg, payload, cmd === "enable");
        }

        if (cmd === "emoji" && isString) return await msg.info(`The current emoji used to flag messages is ${state.emoji}`);
        if (cmd === "emoji") {
            if (!isEmoji) return await msg.failure("Reactions only work with emojis");
            return await this.setEmoji(msg, payload);
        }

        if (cmd === "log" && isString) return await msg.info(`The current logging channel is <#${payload.id}>`);
        if (cmd === "log") {
            if (!isChannel) return await msg.failure("I can only log in text channels");
            return await this.setLogChannel(msg, payload);
        }

        if (cmd === "status" && isString) {
            const statusEmbed = new MessageEmbed();
            const logChannel = state.log ? `<#${state.log}>` : "Not set";
            const flagEmoji = state.emoji ? state.emoji : "Not set";
            const monitorList = Object.keys(state.channels).map(id => `<#${id}>`).join("\n");
            statusEmbed.setTitle("Message Flagging Status");
            statusEmbed.addField("Log Channel", logChannel, true);
            statusEmbed.addField("Flag Emoji", flagEmoji, true);
            statusEmbed.addField("Monitored Channels", monitorList ? monitorList : "None", false);
            statusEmbed.setColor(Constants.Colors.INFO);
            return await msg.embed(statusEmbed);
        }

        await msg.failure("Did not understand the command.");

    }

    async toggleChannelMonitor(msg, channel, shouldEnable) {
        const state = await msg.guild.settings.get(dataId, defaultData);

        if (!channel.permissionsFor(this.client.user).has(["VIEW_CHANNEL", "SEND_MESSAGES", "MANAGE_MESSAGES"])) return await msg.failure(`${this.client.user.username} does not have permissions to manage messages in <#${channel.id}>.`); // Permissions check

        if (shouldEnable) {
            state.channels[channel.id] = true;
            await msg.success(`I will start monitoring <#${channel.id}>.`); // Check if setting same channel
        }
        else {
            delete state.channels[channel.id];
            await msg.success(`I will stop monitoring <#${channel.id}>.`);
        }

        await msg.guild.settings.set(dataId, state);
    }

    async setEmoji(msg, emoji) {
        const state = await msg.guild.settings.get(dataId, defaultData);
        state.emoji = emoji.toString();
        await msg.guild.settings.set(dataId, state);
        await msg.success(`Emoji set to ${emoji.toString()}.`);
    }

    async setLogChannel(msg, channel) {
        const state = await msg.guild.settings.get(dataId, defaultData);
        if (!channel.permissionsFor(this.client.user).has(["VIEW_CHANNEL", "SEND_MESSAGES"])) return await msg.failure(`${this.client.user.username} does not have permissions to read/send messages in <#${channel.id}>.`); // Permissions check
        state.log = channel.id;
        await msg.guild.settings.set(dataId, state);
        await msg.success(`Log channel set to <#${channel.id}>.`);
    }
};
