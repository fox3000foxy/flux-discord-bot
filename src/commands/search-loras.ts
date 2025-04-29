import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { AudioModel, Lora, WeightsApi } from "../libs/weights-api";

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
    const type = "image";

    try {
      await interaction.deferReply({ ephemeral: true });
      const startTime = Date.now();

      let result = [];
      let embeds: EmbedBuilder[]; 
      if(type=="image") {
        result = (await api.searchLoras({ query: query })) as Lora[];
        embeds = result.map((model) =>
          new EmbedBuilder()
            .setTitle(model.name)
            .setThumbnail(model.image)
            .addFields({
              name: "Tags",
              value: model.tags.length > 0 ? model.tags.join(", ") : "None",
            }),
        );
      }
      else {
        result = (await api.searchAudioModels({ query: query })) as AudioModel[];
        embeds = result.map((model) =>
          new EmbedBuilder()
            .setTitle(model.title)
            .setThumbnail(model.image)
            .setDescription(model.content)
        );
      }

      if (!Array.isArray(result)) {
        console.error(`Invalid ${type=="image"?"LoRA":"voice model"} data:`, result);
        await interaction.editReply({
          content: "Error: Invalid LoRA data received.",
        });
        return;
      }

      if (result.length === 0) {
        await interaction.editReply({
          content: `No ${type=="image"?"LoRAs":"voice models"} found matching your query.`,
        });
        return;
      }

      const duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      
      await interaction.editReply({
        content: `Research made in ${duration}`,
        embeds,
      });
    } catch (error) {
      console.error("Search LoRAs fetch error:", error);
      await interaction.editReply({
        content: "No LoRAs found matching your query.",
      });
    }
  },
};

export default command;
