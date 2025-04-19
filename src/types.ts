import {
  CommandInteraction,
  AutocompleteInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { WeightsApi } from "./libs/weights-api";

export interface Command {
  data: SlashCommandBuilder;
  execute: (
    interaction: CommandInteraction,
    api: WeightsApi | null,
  ) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface Config {
  DISCORD_TOKEN: string;
  API_URL: string;
  API_KEY: string;
}
