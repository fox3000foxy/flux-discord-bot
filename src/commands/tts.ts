import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder } from "discord.js";
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
     .addNumberOption((option) =>
      option
        .setName("pitch")
        .setDescription("The pitch of the voice")
        .setMinValue(-12)
        .setMaxValue(12)
        .setRequired(false)
     )
     .addBooleanOption((option) =>
      option
        .setName("male")
        .setDescription("True is the base voice should be male, false is the base voice should be female")
        .setRequired(false)
     )
    .setDescription("Fetches the quota information."),

  async execute(interaction: ChatInputCommandInteraction, api: WeightsApi) {
    try {
      await interaction.deferReply();

      const voice = interaction.options.getString("voice", true);
      const text = interaction.options.getString("text", true);
      const pitch = interaction.options.getNumber("pitch") ?? 0; // Default to 0 if not provided
      const male = interaction.options.getBoolean("male") ?? true; // Default to false if not provided

      const { result } = await api.generateFromTTS(voice, text, pitch, male);
      const fileData = await fetch(result).then((res) => res.arrayBuffer());
      const attachmentBuilder = new AttachmentBuilder(Buffer.from(fileData), { name: "converted_audio.mp3" })
      const attachments = [attachmentBuilder];

      await interaction.editReply({
        content: "Here is your TTS audio:",
        files: attachments
      });
    } catch (error) {
      console.error("Quota fetch error:", error);
      await interaction.editReply({
        content: "Error: Failed to generate TTS. This may due to server not launching yet, or your prompt characters are wrong.",
      });
    }
  },
};

export default command;
