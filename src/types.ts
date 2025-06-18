// src/types.ts
import {AutocompleteInteraction, BaseInteraction, ButtonInteraction, ChatInputCommandInteraction, Collection, ModalSubmitInteraction, SlashCommandBuilder} from "discord.js";


// Extend the Discord.js Client interface globally
declare module "discord.js" {
    interface Client {
        cpuUsage: NodeJS.CpuUsage;
        commands: Collection<string, CommandModule>
    }
}

export type CommandModule = {
    data: SlashCommandBuilder;
    owner?: boolean;
    execute: <T extends BaseInteraction = ChatInputCommandInteraction>(interaction: T) => Promise<void>;
    autocomplete: <T extends BaseInteraction = AutocompleteInteraction>(i: T) => unknown;
    button: <T extends BaseInteraction = ButtonInteraction>(i: T) => unknown;
    modal: <T extends BaseInteraction = ModalSubmitInteraction>(i: T) => unknown;
}

export interface EventModule {
    name: string;
    once?: boolean;
    execute: (...args: unknown[]) => Promise<void>;
}

export interface CommandStats {
    commands?: {
        [key: string]: number;
    }
}

// Leveling system types
export interface UserLevelData {
    level: number;
    xp: number;
}

export interface GuildConfig {
    ignoredRoles: string[];
    ignoredChannels: string[];
    levelUpMessage: string;
    shouldDM: boolean;
}

export interface RewardConfig {
    level: number;
    roleId: string;
    shouldRemove: boolean; // Whether to remove when reaching next tier
}

// Efficient leaderboard types
export interface LeaderboardEntry {
    userId: string;
    level: number;
    xp: number;
    rank: number;
}

export interface CachedLeaderboard {
    entries: LeaderboardEntry[];
    lastUpdated: number;
    totalUsers: number;
}

// Profile data (if this is for a different feature like table tennis profiles)
export interface ProfileData {
    forehand?: string;
    backhand?: string;
    blade?: string;
    strengths?: string;
    weaknesses?: string;
    playstyle?: string;
}
