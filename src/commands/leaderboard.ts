import {SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, InteractionContextType} from "discord.js";
import Paginator from "../paginator";
import {levels} from "../db";
import type {UserLevelData} from "../types";


async function getGuildLeaderboard(guildId: string): Promise<Array<{userId: string; level: number; xp: number;}>> {
    const guildData = await levels.get(guildId) as Record<string, UserLevelData> | undefined ?? {};

    // Convert to array and sort
    const sortedUsers = Object.entries(guildData)
        .filter(([, data]) => data.xp > 0) // Only include users with XP
        .map(([userId, data]) => ({
            userId,
            level: data.level,
            xp: data.xp,
        }))
        .sort((a, b) => {
            if (a.xp !== b.xp) return b.xp - a.xp; // Sort by XP descending
            return b.level - a.level; // Then by level descending
        });


    return sortedUsers;
}

export default {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the server's level leaderboard")
        .setContexts(InteractionContextType.Guild),

    async execute(interaction: ChatInputCommandInteraction<"cached">) {
        await interaction.deferReply();

        try {
            // Get full leaderboard data
            const leaderboardData = await getGuildLeaderboard(interaction.guildId);

            if (leaderboardData.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor("Gold")
                    .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
                    .setDescription("No users found with XP yet! Send some messages to start earning XP!");

                return await interaction.editReply({
                    embeds: [embed]
                });
            }

            // Format entries for the paginator
            const entries = leaderboardData.map((entry, index) => {
                const rank = index + 1; // Rank is 1-based
                const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "▫️";
                return `${medal} **#${rank}** <@${entry.userId}> - Level ${entry.level} (${entry.xp.toLocaleString()} XP)`;
            });

            // Create and configure paginator
            const paginator = new Paginator(interaction, entries, 10);

            // Configure the embed
            paginator.embed
                .setColor("Gold")
                .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
                .setTimestamp();

            // Start pagination
            await paginator.paginate();

        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            await interaction.editReply({
                content: "An error occurred while fetching the leaderboard. Please try again later."
            });
        }
    },
};
