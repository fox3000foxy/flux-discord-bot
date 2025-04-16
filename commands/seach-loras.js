const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search-loras')
        .setDescription('Searches for LoRAs.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The search query')
                .setRequired(true)),
    async execute(interaction) {
        const query = interaction.options.getString('query');
        try {
            const response = await fetch(`${API_URL}/search-loras?query=${query}`, {
                headers: {
                    'x-api-key': `${API_KEY}`,
                },
            });

            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                await interaction.reply({ content: `Error: HTTP ${response.status}`, ephemeral: true });
                return;
            }

            const loras = await response.json();

            if (!Array.isArray(loras)) {
                console.error('Invalid LoRA data:', loras);
                await interaction.reply({ content: 'Error: Invalid LoRA data received.', ephemeral: true });
                return;
            }

            if (loras.length === 0) {
                await interaction.reply({ content: 'No LoRAs found matching your query.', ephemeral: true });
                return;
            }

            const embeds = loras.map(lora => new EmbedBuilder()
                .setTitle(lora.name)
                .setThumbnail(lora.image)
                .addFields({ name: 'Tags', value: lora.tags.length > 0 ? lora.tags.join(', ') : 'None' })
            );

            await interaction.reply({ embeds: embeds, ephemeral: true });

        } catch (error) {
            console.error("Search LoRAs fetch error:", error);
            await interaction.reply({ content: 'Error: Failed to search for LoRAs.', ephemeral: true });
        }
    },
};