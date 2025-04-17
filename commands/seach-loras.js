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
            await interaction.deferReply({ ephemeral: true });

            const response = await fetch(`${API_URL}/search-loras?query=${query}`, {
                headers: {
                    'x-api-key': `${API_KEY}`,
                },
                timeout: 5000, // 5 seconds timeout
            });

            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                await interaction.editReply({ content: `Error: HTTP ${response.status}` });
                return;
            }

            const loras = await response.json();

            if (!Array.isArray(loras)) {
                console.error('Invalid LoRA data:', loras);
                await interaction.editReply({ content: 'Error: Invalid LoRA data received.' });
                return;
            }

            if (loras.length === 0) {
                await interaction.editReply({ content: 'No LoRAs found matching your query.' });
                return;
            }

            const embeds = loras.map(lora => new EmbedBuilder()
                .setTitle(lora.name)
                .setThumbnail(lora.image)
                .addFields({ name: 'Tags', value: lora.tags.length > 0 ? lora.tags.join(', ') : 'None' })
            );

            await interaction.editReply({ embeds: embeds });

        } catch (error) {
            console.error("Search LoRAs fetch error:", error);
            // await interaction.editReply({ content: 'Error: Failed to search for LoRAs.' });
            await interaction.editReply({ content: 'No LoRAs found matching your query.' });
        }
    },
};