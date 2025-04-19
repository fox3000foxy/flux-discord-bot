import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { WeightsApi } from "../libs/weights-api";

interface LoraData {
  name: string;
  image: string;
  tags: string[];
}

const command = {
  data: new SlashCommandBuilder()
    .setName("search-loras")
    .setDescription("Searches for LoRAs.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("The search query")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction, api: WeightsApi) {
    const query = interaction.options.getString("query", true);
    try {
      await interaction.deferReply({ ephemeral: true });

      const loras = (await api.searchLoras({ query: query })) as LoraData[];

      if (!Array.isArray(loras)) {
        console.error("Invalid LoRA data:", loras);
        await interaction.editReply({
          content: "Error: Invalid LoRA data received.",
        });
        return;
      }

      if (loras.length === 0) {
        await interaction.editReply({
          content: "No LoRAs found matching your query.",
        });
        return;
      }

      const embeds = loras.map((lora) =>
        new EmbedBuilder()
          .setTitle(lora.name)
          .setThumbnail(lora.image)
          .addFields({
            name: "Tags",
            value: lora.tags.length > 0 ? lora.tags.join(", ") : "None",
          }),
      );

      await interaction.editReply({ embeds });
    } catch (error) {
      console.error("Search LoRAs fetch error:", error);
      await interaction.editReply({
        content: "No LoRAs found matching your query.",
      });
    }
  },
};

export default command;
