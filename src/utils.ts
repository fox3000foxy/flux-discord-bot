import Replicate from "replicate";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const replicate = new Replicate();

export async function generateAudioConversion(
  input_audio: string,
  custom_rvc_model_download_url: string,
  pitch_change = 0,
) {
  const input = {
    protect: 0.5,
    rvc_model: "CUSTOM",
    index_rate: 1,
    input_audio,
    pitch_change,
    rms_mix_rate: 1,
    filter_radius: 1,
    custom_rvc_model_download_url,
  };
  const output: unknown = await replicate.run(
    "pseudoram/rvc-v2:d18e2e0a6a6d3af183cc09622cebba8555ec9a9e66983261fc64c8b1572b7dce",
    { input },
  );
  // await writeFile("output.wav", output as Buffer);
  return output as Buffer;
}

export async function generateRealisticTTS(msg: string): Promise<Buffer> {
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
