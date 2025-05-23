import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  ContextMenuCommandInteraction,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import { v4 } from "uuid";
import { WeightsApi } from "../libs/weights-api";
import { generateAudioConversion } from "../utils";

const command = {
  data: new ContextMenuCommandBuilder()
    .setName("Convert Voice")
    .setType(ApplicationCommandType.Message),

  async execute(interaction: ContextMenuCommandInteraction, api: WeightsApi) {
    await api;
    if (!interaction.isMessageContextMenuCommand()) return;

    const message = interaction.targetMessage;
    const audioURL = message.attachments.first()?.url;
    if (!audioURL) {
      await interaction.reply({
        content: "No audio file found in the message.",
        ephemeral: true,
      });
      return;
    }

    const id = v4().split("-")[0];

    const modal = new ModalBuilder()
      .setCustomId("voiceConvertModal" + id)
      .setTitle("Voice Conversion");

    const voiceInput = new TextInputBuilder()
      .setCustomId("voiceName")
      .setLabel("Voice Model URL")
      .setPlaceholder("https://example.com/voice_model.zip")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const pitchInput = new TextInputBuilder()
      .setCustomId("pitchValue")
      .setLabel("Pitch (optional, -12 to 12)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const firstActionRow =
      new ActionRowBuilder<TextInputBuilder>().addComponents(voiceInput);
    const secondActionRow =
      new ActionRowBuilder<TextInputBuilder>().addComponents(pitchInput);

    modal.addComponents(firstActionRow, secondActionRow);

    await interaction.showModal(modal);

    interaction.client.once("interactionCreate", async (modalInteraction) => {
      if (!modalInteraction.isModalSubmit()) return;
      if (modalInteraction.customId === "voiceConvertModal" + id) {
        await modalInteraction.deferReply();

        const voice = modalInteraction.fields.getTextInputValue("voiceName");
        const pitchStr =
          modalInteraction.fields.getTextInputValue("pitchValue");
        const pitch = pitchStr ? parseInt(pitchStr, 10) : 0;

        if (pitch < -12 || pitch > 12) {
          await modalInteraction.editReply({
            content: "Error: Pitch must be between -12 and 12.",
          });
          return;
        }

        try {
          const fileData = await generateAudioConversion(
            audioURL,
            voice,
            pitch,
          );
          const attachmentBuilder = new AttachmentBuilder(fileData, {
            name: "converted_audio.mp3",
          });
          const attachments = [attachmentBuilder];

          await modalInteraction.editReply({
            content: "Here is your converted audio:",
            files: attachments,
          });
        } catch (error) {
          console.error("Voice conversion error:", error);
          await modalInteraction.editReply({
            content:
              "Error: Failed to convert audio. Please check the voice name and try again. This may due to server not launching yet.",
          });
        }
      }
    });
  },
};

export default command;
