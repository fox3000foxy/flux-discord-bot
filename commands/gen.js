const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gen')
        .setDescription('Replies with a generated image!')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('The image prompt')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('loraname')
                .setDescription('The name of the LoRA to add')
                .setRequired(false)),
    async execute(interaction) {
        const prompt = interaction.options.getString('prompt');
        const loraName = interaction.options.getString('loraname');

        if (prompt.length < 10) {
            let errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Error')
                .setDescription('Prompt must be at least 10 characters long.');
            await interaction.reply({ embeds: [errorEmbed] });
            return;
        }

        // Initial reply with an embed
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Image Generation')
            .setDescription('Generating image...');

        await interaction.reply({ embeds: [embed] });

        try {
            let apiUrl = `${API_URL}/generateImage?prompt=${encodeURIComponent(prompt)}`;
            if (loraName) {
                apiUrl += `&loraName=${encodeURIComponent(loraName)}`;
                embed.setDescription(`Generating image with LoRA: ${loraName}...`);
            } else {
                embed.setDescription('Generating image without LoRA...');
            }
            await interaction.editReply({ embeds: [embed] });

            embed.setDescription('Image is in queue...');

            await interaction.editReply({ embeds: [embed] });

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'x-api-key': `${API_KEY}`,
                },
            });

            const data = await response.json();

            if (data.error) {
                embed.setColor(0xFF0000).setDescription(`Error: ${data.error}`);
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const { imageId, imageUrl } = data;
            console.log(data);
            await updateStatus(interaction, imageId, imageUrl, embed, true);

        } catch (err) {
            let errorMessage = err.message;
            if (err.code === 'ECONNREFUSED') {
                errorMessage = "The Weights.gg Unofficial API server is down (Connection Refused). Please ensure it is running and accessible.";
            } else if (err instanceof fetch.FetchError) {
                errorMessage = `Failed to fetch image: ${err.message}. Please check the API URL and your network connection. Ensure the API URL is correct and accessible.`;
            } else {
                errorMessage = `An unexpected error occurred: ${err.message}`;
            }
            console.error('Fetch error: ', errorMessage);
            embed.setColor(0xFF0000).setDescription(`An error occurred: ${errorMessage}`);
            await interaction.editReply({ embeds: [embed] });
        }
    },
};

async function updateStatus(interaction, imageId, imageUrl, embed, firstCall = false) {
    try {
        const response = await fetch(`${API_URL}/status/${imageId}`, {
            method: 'GET',
            headers: {
                'x-api-key': `${API_KEY}`,
            },
        });
        const stats = await response.json();
        const { status } = stats;
        const lastModifiedDate = stats.lastModifiedDate || null;

        switch (status) {
            case "COMPLETED":
                embed.setImage(imageUrl).setDescription(`Image generation complete!`);
                await interaction.editReply({ embeds: [embed] });
            return;
            case "STARTING":
                if (firstCall) {
                    embed.setDescription('Image generation in progress...');
                    await interaction.editReply({ embeds: [embed] });
                }
            break;
            case "PENDING":
                embed.setImage(`${imageUrl}?status=${status}&randomHash=${lastModifiedDate}`);
                await interaction.editReply({ embeds: [embed] });
            break;
        }

        if (status !== "COMPLETED") {
            await sleep(100);
            await updateStatus(interaction, imageId, imageUrl, embed);
            return;
        }
    } catch (error) {
        console.error("Status update error:", error);
        embed.setColor(0xFF0000).setDescription("Failed to update image status.");
        await interaction.editReply({ embeds: [embed] });
    }
}