import { CommandInteraction, AutocompleteInteraction, SlashCommandBuilder } from 'discord.js';

export interface Command {
    data: SlashCommandBuilder;
    execute: (interaction: CommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface Config {
    DISCORD_TOKEN: string;
    API_URL: string;
    API_KEY: string;
}