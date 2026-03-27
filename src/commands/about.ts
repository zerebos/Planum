import childProcess from "child_process";
import {promisify} from "util";
import {SlashCommandBuilder, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction} from "discord.js";
import {getAllCommandStats} from "../db";


const exec = promisify(childProcess.exec);
const inviteLink = `https://discord.com/oauth2/authorize?client_id=${process.env.BOT_CLIENT_ID}&permissions=${process.env.BOT_PERMISSIONS || "0"}&scope=bot%20applications.commands`;

export default {
    data: new SlashCommandBuilder()
        .setName("about")
        .setDescription("Gives some information about the bot"),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const aboutEmbed = new EmbedBuilder();

        aboutEmbed.setColor("Blue");
        aboutEmbed.setAuthor({name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL()});

        const owner = await interaction.client.users.fetch(process.env.BOT_OWNER_ID!);
        if (owner) aboutEmbed.setFooter({text: `Created by @${owner.username}`, iconURL: owner.displayAvatarURL()});
        aboutEmbed.setTimestamp(interaction.client.readyAt);

        const addField = (n: string, v: string, i?: boolean) => aboutEmbed.addFields({name: n, value: v, inline: i ?? false});

        if (process.env.BOT_DESCRIPTION) addField(`About`, process.env.BOT_DESCRIPTION);

        try {
            const gitExists = await exec("git status");
            if (gitExists.stderr) throw new Error(gitExists.stderr);
            const gitInfo = await exec(`git show -s -3 --format="%s (%cr)"`);
            if (gitInfo.stderr) throw new Error(gitExists.stderr);
            addField(`Latest Changes`, gitInfo.stdout.trim());
        }
        catch (err) {
            console.error(err);
        }

        const links = [];
        if (process.env.SUPPORT_SERVER_URL) links.push({label: "Support Server", url: process.env.SUPPORT_SERVER_URL});
        if (process.env.GITHUB_URL)         links.push({label: "GitHub",         url: process.env.GITHUB_URL});
        if (process.env.TOPGG_ID)           links.push({label: "Top.gg",         url: `https://top.gg/bot/${process.env.TOPGG_ID}`});

        const modulo    = links.length % 3;
        const maxFields = modulo ? links.length + (3 - modulo) : links.length;
        for (let l = 0; l < maxFields; l++) {
            const fieldTitle = l % 3 === 0 ? "Links" : "​";
            const fieldValue = l < links.length ? `[${links[l].label}](${links[l].url})` : "​";
            addField(fieldTitle, fieldValue, true);
        }

        let servingText = `${interaction.client.guilds.cache.size.toLocaleString()} Servers\n`;
        servingText += `${interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toLocaleString()} Users`;
        addField("Serving", servingText, true);

        const textChannelCount  = interaction.client.channels.cache.filter(c => c.type === ChannelType.GuildText).size.toLocaleString();
        const voiceChannelCount = interaction.client.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size.toLocaleString();
        addField("Channels", `Text: ${textChannelCount}\nVoice: ${voiceChannelCount}`, true);

        const now      = Date.now();
        const usage    = process.cpuUsage(interaction.client.cpuUsage);
        const result   = 100 * ((usage.user + usage.system) / ((now - interaction.client.readyAt.valueOf()) * 1000));
        const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        addField("Process", `${memUsage.toFixed(2)} MB\n${result.toFixed(2)}% CPU`, true);

        addField(`Emojis`, interaction.client.emojis.cache.size.toLocaleString(), true);

        // Single aggregated query instead of iterating every guild in cache
        const statsRows  = getAllCommandStats();
        const commandsRun = statsRows.reduce((sum, row) => sum + (row.total ?? 0), 0).toLocaleString();
        addField(`Commands Run`, commandsRun, true);

        addField(`Uptime`, humanReadableUptime(now - interaction.client.readyAt.valueOf()), true);
        await interaction.editReply({
            embeds: [aboutEmbed],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setLabel(`Invite ${interaction.client.user.username}`).setStyle(ButtonStyle.Link).setURL(inviteLink).setEmoji("🔗")
                )
            ]
        });
    },
};

const msInSecond = 1000;
const msInMinute = msInSecond * 60;
const msInHour   = msInMinute * 60;
const msInDay    = msInHour * 24;

function humanReadableUptime(uptime: number): string {
    let remainder = uptime;
    const days    = Math.floor(uptime / msInDay);
    remainder     = remainder - (days * msInDay);
    const hours   = Math.floor(remainder / msInHour);
    remainder     = remainder - (hours * msInHour);
    const minutes = Math.floor(remainder / msInMinute);
    remainder     = remainder - (minutes * msInMinute);
    const seconds = Math.floor(remainder / msInSecond);

    let humanReadable = `${seconds}s`;
    if (minutes) humanReadable = `${minutes}m ${humanReadable}`;
    if (hours)   humanReadable = `${hours}h ${humanReadable}`;
    if (days)    humanReadable = `${days}d ${humanReadable}`;
    return humanReadable;
}