import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import { WeightsApi } from "../libs/weights-api";
import { generateRealisticTTS, generateAudioConversion } from "../utils";

const command = {
  data: new SlashCommandBuilder()
    .setName("tts")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("The text to speak")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("voice_model_url")
        .setDescription("The RVC v2 voice model url to use")
        .setRequired(true),
    )
    .addNumberOption((option) =>
      option
        .setName("pitch")
        .setDescription("The pitch of the voice")
        .setMinValue(-12)
        .setMaxValue(12)
        .setRequired(false),
    )
    .setDescription("Fetches the quota information."),

  async execute(interaction: ChatInputCommandInteraction, api: WeightsApi) {
    await api;
    try {
      await interaction.deferReply();

      const voice = interaction.options.getString("voice_model_url", true);
      const text = interaction.options.getString("text", true);
      const pitch = interaction.options.getNumber("pitch") ?? 0; // Default to 0 if not provided

      interaction.editReply({
        content: "Generating TTS audio...",
      });

      const ttsBuffer = await generateRealisticTTS(text);

      interaction.editReply({
        content: "Generating audio conversion...",
      });

      const data = ttsBuffer.toString("base64");
      const fileInput = `data:application/octet-stream;base64,${data}`;

      const fileData = await generateAudioConversion(fileInput, voice, pitch);

      const attachmentBuilder = new AttachmentBuilder(fileData, {
        name: "converted_audio.mp3",
      });
      const attachments = [attachmentBuilder];

      await interaction.editReply({
        content: "Here is your TTS audio:",
        files: attachments,
      });
    } catch (error) {
      console.error("Quota fetch error:", error);
      await interaction.editReply({
        content:
          "Error: Failed to generate TTS. This may due to server not launching yet.",
      });
    }
  },
};

export default command;
