import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import * as fs from "fs";
import * as path from "path";
import { WeightsApi } from "../libs/weights-api";

interface Restrictions {
  [key: string]: string[];
}

const restrictedLoras: Restrictions = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "..", "restrictions.json"),
    "utf8",
  ),
);

async function updateStatus(
  interaction: CommandInteraction,
  imageId: string,
  api: WeightsApi,
  imageUrl: string,
  firstCall: boolean = false,
): Promise<void> {
  let lastModifiedDateCache: string | null = null;

  try {
    const stats = await api.getStatus({ imageId });
    console.log("Image status:", stats);
    const { status } = stats;
    const lastModifiedDate = stats.lastModifiedDate || null;
    const error = stats.error || null;

    switch (status) {
      case "COMPLETED":
        try {
          const imageResponse = await fetch(imageUrl);
          const arrayBuffer = await imageResponse.arrayBuffer();
          const imageBuffer = Buffer.from(arrayBuffer);

          await interaction.editReply({
            content: "Image generation complete!",
            files: [
              {
                attachment: imageBuffer,
                name: "generated_image.png",
              },
            ],
          });
        } catch (fetchError) {
          console.error("Failed to fetch and attach image:", fetchError);
          await interaction.editReply({
            content: `Image generation complete, but failed to attach image. Please check the URL manually: ${imageUrl}`,
          });
        }
        return;

      case "STARTING":
        if (firstCall) {
          await interaction.editReply({
            content: "Image generation started...",
          });
          lastModifiedDateCache = null;
        }
        break;

      case "QUEUED":
        await interaction.editReply({ content: "Image is in queue" });
        break;

      case "PENDING":
        if (lastModifiedDate !== lastModifiedDateCache) {
          if (lastModifiedDate !== undefined) {
            lastModifiedDateCache = lastModifiedDate;
          }
          try {
            const imageResponse = await fetch(imageUrl);
            const arrayBuffer = await imageResponse.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);

            await interaction.editReply({
              content: "Image generation in progress...",
              files: [
                {
                  attachment: imageBuffer,
                  name: "generated_image.png",
                },
              ],
            });
          } catch (fetchError) {
            console.error("Failed to fetch and attach image:", fetchError);
            await interaction.editReply({
              content: `Image generation in progress...`,
            });
          }
        }
        break;

      case "FAILED":
        await interaction.editReply({
          content: `Image generation failed. Please try again. (Reason : ${error}).`,
        });
        return;
    }
  } catch (error) {
    console.error("Status update error:", error);
    await interaction.editReply({ content: "Failed to update image status." });
  }
}

const command = {
  data: new SlashCommandBuilder()
    .setName("gen")
    .setDescription("Replies with a generated image!")
    .addStringOption((option) =>
      option
        .setName("prompt")
        .setDescription("The image prompt")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("loraname")
        .setDescription("The name of the LoRA to add")
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction, api: WeightsApi) {
    const prompt =
      "IMG_5678.HEIC, " + interaction.options.getString("prompt", true);
    const loraName = interaction.options.getString("loraname") as string | null;

    if (loraName) {
      const userId = interaction.user.id;
      const allowedIds = restrictedLoras[loraName.trim()];

      if (allowedIds) {
        console.log(`LoRA ${loraName} has restricted IDs: ${allowedIds}`);
        if (!allowedIds.includes(userId)) {
          console.log(`User ${userId} is not allowed to use LoRA ${loraName}.`);
          await interaction.reply({
            content: `You are not allowed to use this LoRA.`,
            ephemeral: true,
          });
          return;
        }
      }
    }

    if (prompt.length < 10) {
      await interaction.reply({
        content: "Prompt must be at least 10 characters long.",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({ content: "Generating image..." });

    try {
      const data = await api.generateProgressiveImage(
        {
          query: prompt,
          loraName: loraName,
        },
        () => updateStatus(interaction, data.imageId, api, data.imageUrl, true),
      );

      if ("error" in data) {
        await interaction.editReply({ content: `Error: ${data.error}` });
        return;
      }

      // const { imageId, imageUrl } = data;
      // await updateStatus(interaction, imageId, api, imageUrl, true);
    } catch (err: Error | unknown) {
      if (err instanceof Error) {
        let errorMessage = err.message;
        if (err.message.includes("ECONNREFUSED")) {
          errorMessage =
            "The Weights.gg Unofficial API server is down (Connection Refused). Please ensure it is running and accessible.";
        } else if (err.message.includes("Failed to fetch")) {
          errorMessage = `Failed to fetch image: ${err.message}. Please check the API URL and your network connection.`;
        } else {
          errorMessage = `An unexpected error occurred: ${err.message}`;
        }
        console.error("Fetch error: ", errorMessage);
        await interaction.editReply({
          content: `An error occurred: ${errorMessage}`,
        });
      }
    }
  },
};

export default command;
