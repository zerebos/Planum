import {SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, InteractionContextType} from "discord.js";
import type {UserLevelData} from "../types";
import {levels} from "../db";


// Helper function to calculate XP needed for next level
function getXpForNextLevel(currentLevel: number): number {
    return (currentLevel + 1) * 100; // 100 XP per level
}

/**
 * The level system is based on the scaling function with SCALE = 10:
 * XP for level = (level^2 + level) / 2 * SCALE - (level * SCALE)
 *
 * So the inverse function of this is:
     sqrt(4*xp + 5)
 * level = --------------
 *            sqrt(20)
 */
const xpToLevel = (xp: number) => Math.round(Math.sqrt(4 * xp + 5) / Math.sqrt(20));
const levelToXp = (level: number) => Math.round((level**2 + level) / 2 * 10 - (level * 10));

function createRankEmbed(user: {username: string, avatarURL: () => (string | null)}, levelData: UserLevelData, rank?: number | null) {
    const nextLevelXp = levelToXp(levelData.level + 1);
    const currentLevelXp = levelToXp(levelData.level);
    const progressXp = levelData.xp - currentLevelXp;
    const neededXp = nextLevelXp - currentLevelXp;
    const progressPercentage = Math.floor((progressXp / neededXp) * 100);

    // Create a simple progress bar
    const progressBarLength = 20;
    const filledBars = Math.floor((progressPercentage / 100) * progressBarLength);
    const emptyBars = progressBarLength - filledBars;
    const progressBar = "█".repeat(filledBars) + "░".repeat(emptyBars);

    const embed = new EmbedBuilder()
        .setColor("Blue")
        .setAuthor({name: `${user.username}'s Rank`, iconURL: user.avatarURL()!})
        .addFields(
            {name: "Level", value: `${levelData.level}`, inline: true},
            {name: "XP", value: `${levelData.xp.toLocaleString()}`, inline: true},
            {name: "Rank", value: rank ? `#${rank}` : "Unranked", inline: true},
            {
                name: "Progress to Next Level",
                value: `${progressBar}\n${progressXp}/${neededXp} XP (${progressPercentage}%)`,
                inline: false
            }
        );

    if (user.avatarURL()) {
        embed.setThumbnail(user.avatarURL()!);
    }

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
        const guildData = (await levels.get(interaction.guildId) ?? {}) as Record<string, UserLevelData>;
        if (!guildData[targetUser.id]) {
            guildData[targetUser.id] = {level: 0, xp: 0} as UserLevelData; // Initialize if not found
        }
        const userData = guildData[targetUser.id];
        const users = Object.entries(guildData).sort((a, b) => {
            if (a[1].xp < b[1].xp) return 1;
            if (a[1].xp > b[1].xp) return -1;
            return 0;
        });

        const rank = users.findIndex(entry => entry[0] == targetUser.id) + 1;

        // Create and send embed
        const rankEmbed = createRankEmbed(targetUser, userData, rank);
        await interaction.reply({embeds: [rankEmbed]});
    },
};
