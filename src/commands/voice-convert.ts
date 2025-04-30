import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import { WeightsApi } from "../libs/weights-api";
import { generateAudioConversion } from "../utils";

const command = {
  data: new SlashCommandBuilder()
    .setName("voice-convert")
    .addAttachmentOption((option) =>
      option
        .setName("audio")
        .setDescription("The audio file to convert")
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

      interaction.editReply({
        content: "Generating audio conversion...",
      });

      const voice = interaction.options.getString("voice_model_url", true);
      const attachment = interaction.options.getAttachment("audio", true);
      const pitch = interaction.options.getNumber("pitch") ?? 0; // Default to 0 if not provided

      const url = attachment.url;

      const fileData = await generateAudioConversion(url, voice, pitch);
      const attachmentBuilder = new AttachmentBuilder(fileData, {
        name: "converted_audio.mp3",
      });
      const attachments = [attachmentBuilder];

      await interaction.editReply({
        content: "Here is your converted audio:",
        files: attachments,
      });
    } catch (error) {
      console.error("Quota fetch error:", error);
      await interaction.editReply({
        content:
          "Error: Failed to convert audio with this voice. This may due to server not launching yet.",
      });
    }
  },
};

export default command;
