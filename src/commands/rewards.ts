import {SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, PermissionFlagsBits, InteractionContextType} from "discord.js";
import {getAllRewards, addRoleReward, removeRoleReward} from "../examples/simpleLeveling";

function createRewardsListEmbed(guildName: string, rewards: Array<{level: number; roleId: string; shouldRemove: boolean}>): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor("Gold")
        .setTitle(`🎁 Level Rewards - ${guildName}`)
        .setTimestamp();

    if (rewards.length === 0) {
        embed.setDescription("No level rewards have been set up yet!\n\nUse `/rewards add` to create your first reward.");
        return embed;
    }

    // Sort rewards by level
    const sortedRewards = rewards.sort((a, b) => a.level - b.level);

    const description = sortedRewards.map(reward => {
        const removeText = reward.shouldRemove ? " (removes previous)" : " (keeps previous)";
        return `**Level ${reward.level}:** <@&${reward.roleId}>${removeText}`;
    }).join("\n");

    embed.setDescription(description);
    embed.setFooter({text: `${rewards.length} reward${rewards.length === 1 ? '' : 's'} configured`});

    return embed;
}

export default {
    data: new SlashCommandBuilder()
        .setName("rewards")
        .setDescription("Manage level rewards for this server")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .setContexts(InteractionContextType.Guild)
        .addSubcommand(subcommand =>
            subcommand
                .setName("view")
                .setDescription("View all level rewards in this server")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Add a new level reward")
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to give as a reward")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("level")
                        .setDescription("The level required to earn this reward")
                        .setMinValue(1)
                        .setMaxValue(1000)
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName("remove_previous")
                        .setDescription("Should previous level rewards be removed when this is earned?")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove a level reward")
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role reward to remove")
                        .setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction<"raw" | "cached">) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case "view":
                    await handleViewRewards(interaction);
                    break;
                case "add":
                    await handleAddReward(interaction);
                    break;
                case "remove":
                    await handleRemoveReward(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: "❌ Unknown subcommand",
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error("Error in rewards command:", error);

            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: `❌ ${errorMessage}`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `❌ ${errorMessage}`,
                    ephemeral: true
                });
            }
        }
    },
};

async function handleViewRewards(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guild!.id;
    const rewards = await getAllRewards(guildId);

    const embed = createRewardsListEmbed(interaction.guild!.name, rewards);

    await interaction.reply({
        embeds: [embed]
    });
}

async function handleAddReward(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guild!.id;
    const role = interaction.options.getRole("role", true);
    const level = interaction.options.getInteger("level", true);
    const shouldRemove = interaction.options.getBoolean("remove_previous") ?? true;

    // Validate the role exists and bot can manage it
    if (!interaction.guild!.roles.cache.has(role.id)) {
        await interaction.reply({
            content: "❌ That role doesn't exist in this server!",
            ephemeral: true
        });
        return;
    }

    // Check if bot can manage this role
    const botMember = interaction.guild!.members.me;
    if (botMember && role.position >= botMember.roles.highest.position) {
        await interaction.reply({
            content: "❌ I cannot manage that role! Please make sure my highest role is above the reward role.",
            ephemeral: true
        });
        return;
    }

    try {
        await addRoleReward(guildId, level, role.id, shouldRemove);

        const removeBehavior = shouldRemove ? "Previous rewards will be removed" : "Previous rewards will be kept";

        await interaction.reply({
            content: `✅ **Reward added successfully!**\n\n🎁 <@&${role.id}> will now be given at **Level ${level}**\n📝 ${removeBehavior} when users reach this level`,
            allowedMentions: { roles: [] } // Prevent role ping
        });
    } catch (error) {
        throw error; // Will be caught by main error handler
    }
}

async function handleRemoveReward(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guild!.id;
    const role = interaction.options.getRole("role", true);

    const wasRemoved = await removeRoleReward(guildId, role.id);

    if (wasRemoved) {
        await interaction.reply({
            content: `✅ **Reward removed successfully!**\n\n<@&${role.id}> is no longer a level reward.`,
            allowedMentions: { roles: [] } // Prevent role ping
        });
    } else {
        await interaction.reply({
            content: `❌ <@&${role.id}> was not set as a level reward.`,
            ephemeral: true,
            allowedMentions: { roles: [] } // Prevent role ping
        });
    }
}
