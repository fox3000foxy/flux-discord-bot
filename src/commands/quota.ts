import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { WeightsApi } from "../libs/weights-api";

const command = {
  data: new SlashCommandBuilder()
    .setName("quota")
    .setDescription("Fetches the quota information."),

  async execute(interaction: CommandInteraction, api: WeightsApi) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const quota = await api.getQuota();
      await interaction.editReply({ content: quota });
    } catch (error) {
      console.error("Quota fetch error:", error);
      await interaction.editReply({
        content: "Error: Failed to fetch quota information.",
      });
    }
  },
};

export default command;
