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

// Profile data (for future features such as table-tennis player profiles)
export interface ProfileData {
    forehand?: string;
    backhand?: string;
    blade?: string;
    strengths?: string;
    weaknesses?: string;
    playstyle?: string;
}
