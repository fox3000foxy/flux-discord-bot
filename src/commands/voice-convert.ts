import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder } from "discord.js";
  import Replicate from "replicate";
import { WeightsApi } from "../libs/weights-api";
  const replicate = new Replicate();

async function generateAudioConversion(input_audio: string, custom_rvc_model_download_url: string, pitch_change = 0) {
  const input = {
      protect: 0.5,
      rvc_model: "CUSTOM",
      index_rate: 1,
      input_audio,
      pitch_change,
      rms_mix_rate: 1,
      filter_radius: 1,
      custom_rvc_model_download_url
  };
  const output: unknown = await replicate.run("pseudoram/rvc-v2:d18e2e0a6a6d3af183cc09622cebba8555ec9a9e66983261fc64c8b1572b7dce", { input });
  // await writeFile("output.wav", output as Buffer);
  return output as Buffer;
}

const command = {
  data: new SlashCommandBuilder()
    .setName("voice-convert")
     .addAttachmentOption((option) =>
      option
        .setName("audio")
        .setDescription("The audio file to convert")
        .setRequired(true)
     )
     .addStringOption((option) =>
      option
        .setName("voice_model_url")
        .setDescription("The RVC v2 voice model url to use")
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
    await api;
    try {
      await interaction.deferReply();

      interaction.editReply({
        content: "Generating audio conversion...",
      })

      const voice = interaction.options.getString("voice_model_url", true);
      const attachment = interaction.options.getAttachment("audio", true);
      const pitch = interaction.options.getNumber("pitch") ?? 0; // Default to 0 if not provided

      const url = attachment.url;

      const fileData = await generateAudioConversion(url, voice, pitch);
      const attachmentBuilder = new AttachmentBuilder(fileData, { name: "converted_audio.mp3" })
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
