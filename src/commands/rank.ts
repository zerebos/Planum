import {SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, InteractionContextType} from "discord.js";
import {getUserLevel, getUserRank} from "../db";


/**
 * The level system is based on the scaling function with SCALE = 10:
 * XP for level = (level^2 + level) / 2 * SCALE - (level * SCALE)
 *
 * So the inverse function of this is:
     sqrt(4*xp + 5)
 * level = --------------
 *            sqrt(20)
 */
const xpToLevel = (xp: number)   => Math.round(Math.sqrt(4 * xp + 5) / Math.sqrt(20));
const levelToXp = (level: number) => Math.round((level**2 + level) / 2 * 10 - (level * 10));

function createRankEmbed(user: {username: string, avatarURL: () => (string | null)}, xp: number, level: number, rank: number) {
    const nextLevelXp       = levelToXp(level + 1);
    const currentLevelXp    = levelToXp(level);
    const progressXp        = xp - currentLevelXp;
    const neededXp          = nextLevelXp - currentLevelXp;
    const progressPercentage = Math.floor((progressXp / neededXp) * 100);

    const progressBarLength = 20;
    const filledBars = Math.floor((progressPercentage / 100) * progressBarLength);
    const emptyBars  = progressBarLength - filledBars;
    const progressBar = "█".repeat(filledBars) + "░".repeat(emptyBars);

    const embed = new EmbedBuilder()
        .setColor("Blue")
        .setAuthor({name: `${user.username}'s Rank`, iconURL: user.avatarURL()!})
        .addFields(
            {name: "Level",    value: `${level}`,                       inline: true},
            {name: "XP",       value: `${xp.toLocaleString()}`,          inline: true},
            {name: "Rank",     value: `#${rank}`,                       inline: true},
            {
                name:  "Progress to Next Level",
                value: `${progressBar}\n${progressXp}/${neededXp} XP (${progressPercentage}%)`,
                inline: false
            }
        );

    if (user.avatarURL()) embed.setThumbnail(user.avatarURL()!);
    return embed;
}

export default {
    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("View your current rank!")
        .addUserOption(option => option.setName("user").setDescription("Whose profile to view?").setRequired(false))
        .setContexts(InteractionContextType.Guild),

    async execute(interaction: ChatInputCommandInteraction<"raw" | "cached">) {
        if (!interaction.isChatInputCommand()) return;

        const targetUser = interaction.options.getUser("user") ?? interaction.user;
        const row        = getUserLevel(interaction.guildId, targetUser.id);
        const xp         = row?.xp    ?? 0;
        const level      = row?.level ?? xpToLevel(xp);
        const rank       = getUserRank(interaction.guildId, xp);

        const rankEmbed = createRankEmbed(targetUser, xp, level, rank);
        await interaction.reply({embeds: [rankEmbed]});
    },
};
