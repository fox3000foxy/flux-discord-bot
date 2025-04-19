"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("quota")
        .setDescription("Fetches the quota information."),
    async execute(interaction, api) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const quota = await api.getQuota();
            await interaction.editReply({ content: quota });
        }
        catch (error) {
            console.error("Quota fetch error:", error);
            await interaction.editReply({
                content: "Error: Failed to fetch quota information.",
            });
        }
    },
};
exports.default = command;
