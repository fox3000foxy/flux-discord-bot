"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const node_fetch_1 = __importDefault(require("node-fetch"));
const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('quota')
        .setDescription('Fetches the quota information.'),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const response = await (0, node_fetch_1.default)(`${API_URL}/quota`, {
                //@ts-ignore
                headers: {
                    'x-api-key': API_KEY,
                },
                timeout: 5000, // 5 seconds timeout
            });
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                await interaction.editReply({ content: `Error: HTTP ${response.status}` });
                return;
            }
            const quota = await response.text();
            await interaction.editReply({ content: quota });
        }
        catch (error) {
            console.error("Quota fetch error:", error);
            await interaction.editReply({ content: 'Error: Failed to fetch quota information.' });
        }
    },
};
exports.default = command;
