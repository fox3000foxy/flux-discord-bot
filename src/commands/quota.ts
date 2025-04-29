import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { WeightsApi } from "../libs/weights-api";

const command = {
  data: new SlashCommandBuilder()
    .setName("quota")
    .setDescription("Fetches the quota information."),

  async execute(interaction: CommandInteraction, api: WeightsApi) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const quotasText = await api.getQuota();
      await interaction.editReply({
        content: quotasText
      });
      // const quotas = JSON.parse(quotasText);
      // await interaction.editReply({ content: "Images: " + quotas.usage.DAILY_IMAGE_CREATIONS + " of " + quotas.limits.DAILY_IMAGE_CREATIONS +
      //   "\n" + "Voices: " + quotas.usage.DAILY_COVER_CREATIONS + " of " + quotas.limits.DAILY_COVER_CREATIONS
      //  });
    } catch (error) {
      console.error("Quota fetch error:", error);
      await interaction.editReply({
        content: "Error: Failed to fetch quota information. This may due to server not launching yet.",
      });
    }
  },
};

export default command;
