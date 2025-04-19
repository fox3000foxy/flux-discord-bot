import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import fetch from "node-fetch";

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

const command = {
  data: new SlashCommandBuilder()
    .setName("quota")
    .setDescription("Fetches the quota information."),

  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const headers: { [key: string]: string } = {};
      if (API_KEY) {
        headers["x-api-key"] = API_KEY;
      }

      const response = await fetch(`${API_URL}/quota`, {
        headers: headers,
        timeout: 5000, // 5 seconds timeout
      });

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        await interaction.editReply({
          content: `Error: HTTP ${response.status}`,
        });
        return;
      }

      const quota = await response.text();
      await interaction.editReply({ content: quota });
    } catch (error) {
      console.error("Quota fetch error:", error);
      await interaction.editReply({
        content: "Error: Failed to fetch quota information.",
      });
    }
  },
};

export default command;
