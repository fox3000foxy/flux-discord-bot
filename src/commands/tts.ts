import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder } from "discord.js";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import Replicate from "replicate";
import { WeightsApi } from "../libs/weights-api";
const replicate = new Replicate();

async function generateRealisticTTS(msg: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  const voiceName = "fr-FR-DeniseNeural";
  const outputFormat = OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3;
  await tts.setMetadata(voiceName, outputFormat);
  const audioStream = await tts.toStream(msg);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    audioStream.audioStream.on("end", () => resolve());
    audioStream.audioStream.on("error", reject);
  });

  return Buffer.concat(chunks);
}

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
    .setName("tts")
     .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("The text to speak")
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

      const voice = interaction.options.getString("voice_model_url", true);
      const text = interaction.options.getString("text", true);
      const pitch = interaction.options.getNumber("pitch") ?? 0; // Default to 0 if not provided

      interaction.editReply({
        content: "Generating TTS audio...",
      })

      const ttsBuffer = await generateRealisticTTS(text);
      
      interaction.editReply({
        content: "Generating audio conversion...",
      })

      const data = ttsBuffer.toString("base64");
      const fileInput = `data:application/octet-stream;base64,${data}`;

      const fileData = await generateAudioConversion(fileInput, voice, pitch);
      
      const attachmentBuilder = new AttachmentBuilder(fileData, { name: "converted_audio.mp3" })
      const attachments = [attachmentBuilder];

      await interaction.editReply({
        content: "Here is your TTS audio:",
        files: attachments
      });
    } catch (error) {
      console.error("Quota fetch error:", error);
      await interaction.editReply({
        content: "Error: Failed to generate TTS. This may due to server not launching yet.",
      });
    }
  },
};

export default command;
