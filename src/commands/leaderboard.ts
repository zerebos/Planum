import {SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, InteractionContextType} from "discord.js";
import Paginator from "../paginator";
import {getGuildLeaderboard} from "../db";


export default {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the server's level leaderboard")
        .setContexts(InteractionContextType.Guild),

    async execute(interaction: ChatInputCommandInteraction<"cached">) {
        await interaction.deferReply();

        try {
            const leaderboardData = getGuildLeaderboard(interaction.guildId);

            if (leaderboardData.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor("Gold")
                    .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
                    .setDescription("No users found with XP yet! Send some messages to start earning XP!");
                return await interaction.editReply({embeds: [embed]});
            }

            const entries = leaderboardData.map((entry, index) => {
                const rank  = index + 1;
                const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "▫️";
                return `${medal} **#${rank}** <@${entry.userId}> - Level ${entry.level} (${entry.xp.toLocaleString()} XP)`;
            });

            const paginator = new Paginator(interaction, entries, 10);
            paginator.embed
                .setColor("Gold")
                .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
                .setTimestamp();
            await paginator.paginate();

        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            await interaction.editReply({content: "An error occurred while fetching the leaderboard. Please try again later."});
        }
    },
};
