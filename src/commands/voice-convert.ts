import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder } from "discord.js";
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
     .addNumberOption((option) =>
      option
        .setName("pitch")
        .setDescription("The pitch of the voice")
        .setMinValue(-12)
        .setMaxValue(12)
        .setRequired(false)
     )
    .setDescription("Fetches the quota information."),

  async execute(interaction: ChatInputCommandInteraction, api: WeightsApi) {
    try {
      await interaction.deferReply();

      const voice = interaction.options.getString("voice", true);
      const attachment = interaction.options.getAttachment("audio", true);
      const pitch = interaction.options.getNumber("pitch") ?? 0; // Default to 0 if not provided

      const url = attachment.url;

      const { result } = await api.generateFromAudioURL(voice, url, pitch);
      const fileData = await fetch(result).then((res) => res.arrayBuffer());
      const attachmentBuilder = new AttachmentBuilder(Buffer.from(fileData), { name: "converted_audio.mp3" })
      const attachments = [attachmentBuilder];

      await interaction.editReply({
        content: "Here is your converted audio:",
        files: attachments
      });
    } catch (error) {
      console.error("Quota fetch error:", error);
      await interaction.editReply({
        content: "Error: Failed to convert audio with this voice. This may due to server not launching yet.",
      });
    }
  },
};

export default command;
