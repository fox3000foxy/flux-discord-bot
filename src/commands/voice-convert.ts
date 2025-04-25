import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { WeightsApi } from "../libs/weights-api";

const command = {
  data: new SlashCommandBuilder()
    .setName("voice-convert")
    .addStringOption((option) =>
      option
        .setName("voice")
        .setDescription("The voice name to use")
        .setRequired(true)
     )
     .addAttachmentOption((option) =>
      option
        .setName("audio")
        .setDescription("The audio file to convert")
        .setRequired(true)
     )
    .setDescription("Fetches the quota information."),

  async execute(interaction: ChatInputCommandInteraction, api: WeightsApi) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const voice = interaction.options.getString("voice", true);
      const attachment = interaction.options.getAttachment("audio", true);

      const url = attachment.url;

      console.log("Audio URL:", url); // Log the URL for debugging

      const { result } = await api.generateFromAudioURL(voice, url);
      await interaction.editReply({ content: result });
    } catch (error) {
      console.error("Quota fetch error:", error);
      await interaction.editReply({
        content: "Error: Failed to convert audio with this voice. This may due to server not launching yet.",
      });
    }
  },
};

export default command;
