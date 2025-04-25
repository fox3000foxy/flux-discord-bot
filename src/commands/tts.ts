import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { WeightsApi } from "../libs/weights-api";

const command = {
  data: new SlashCommandBuilder()
    .setName("tts")
    .addStringOption((option) =>
      option
        .setName("voice")
        .setDescription("The voice name to use")
        .setRequired(true)
     )
     .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("The text to speak")
        .setRequired(true)
     )
    .setDescription("Fetches the quota information."),

  async execute(interaction: ChatInputCommandInteraction, api: WeightsApi) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const voice = interaction.options.getString("voice", true);
      const text = interaction.options.getString("text", true);

      const { result } = await api.generateFromTTS(voice, text);
      await interaction.editReply({ content: result });
    } catch (error) {
      console.error("Quota fetch error:", error);
      await interaction.editReply({
        content: "Error: Failed to generate TTS.",
      });
    }
  },
};

export default command;
