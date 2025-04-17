const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;
let lastModifiedDateCache = null;

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
                .setRequired(false)
                .setAutocomplete(false)), // Enable autocomplete
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        try {
            const response = await fetch(`${API_URL}/search-loras?query=${focusedValue}`, {
                headers: {
                    'x-api-key': `${API_KEY}`,
                },
            });

            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                return;
            }

            const loras = await response.json();

            if (!Array.isArray(loras)) {
                console.error('Invalid LoRA data:', loras);
                return;
            }

            const filtered = loras.filter(lora => lora.name.startsWith(focusedValue));
            await interaction.respond(
                filtered.map(lora => ({ name: lora.name, value: lora.name })),
            );
        } catch (error) {
            console.error("Autocomplete fetch error:", error);
        }
    },
    async execute(interaction) {
        const prompt = "IMG_5678.HEIC," + interaction.options.getString('prompt');
        const loraName = interaction.options.getString('loraname');

        //EXCEPTIONAL PROHIBITION
        const restrictedLoras = JSON.parse(fs.readFileSync(path.join(__dirname,'..','/restrictions.json'), 'utf8').toString());

        if (!loraName) {
            // If no LoRA name is provided, skip the check
            // and proceed with image generation
            console.log('No LoRA name provided, skipping restriction check.');
        } else {
            const userId = interaction.user.id;
            let allowedIds = restrictedLoras[loraName.trim()] || null;
            if (!allowedIds) {
                // If the LoRA is not in the restrictions list, skip the check
                console.log(`LoRA ${loraName} is not restricted, skipping check.`);
            } else {
                // If the LoRA is in the restrictions list, check if it has allowed IDs
                console.log(`LoRA ${loraName} has restricted IDs: ${allowedIds}`);
                if(!allowedIds.includes(userId)) {
                    // If the user ID is not in the allowed IDs, deny access
                    console.log(`User ${userId} is not allowed to use LoRA ${loraName}.`);
                    await interaction.reply({ content: `You are not allowed to use this LoRA.`, ephemeral: true });
                    return;
                }
            }
        }
        //END OF EXCEPTIONAL PROHIBITION

        if (prompt.length < 10) {
            await interaction.reply({ content: 'Prompt must be at least 10 characters long.', ephemeral: true });
            return;
        }

        // Initial reply
        await interaction.reply({ content: 'Generating image...' });

        try {
            let apiUrl = `${API_URL}/generateImage?prompt=${encodeURIComponent(prompt)}`;
            if (loraName) {
                apiUrl += `&loraName=${encodeURIComponent(loraName)}`;
                await interaction.editReply({ content: `Generating image with LoRA: ${loraName}...` });
            } else {
                await interaction.editReply({ content: 'Generating image without LoRA...' });
            }

            await interaction.editReply({ content: 'Image is in queue...' });

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'x-api-key': `${API_KEY}`,
                },
            });

            const data = await response.json();

            if (data.error) {
                await interaction.editReply({ content: `Error: ${data.error}` });
                return;
            }

            const { imageId, imageUrl } = data;
            console.log(data);
            await updateStatus(interaction, imageId, imageUrl, true);

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
            await interaction.editReply({ content: `An error occurred: ${errorMessage}` });
        }
    },
};

async function updateStatus(interaction, imageId, imageUrl, firstCall = false) {
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
        const error = stats.error || null;

        switch (status) {
            case "COMPLETED":
                try {
                    const imageResponse = await fetch(imageUrl);
                    const imageBuffer = await imageResponse.buffer();

                    await interaction.editReply({
                        content: 'Image generation complete!',
                        files: [{
                            attachment: imageBuffer,
                            name: 'generated_image.png'
                        }],
                    });
                } catch (fetchError) {
                    console.error("Failed to fetch and attach image:", fetchError);
                    await interaction.editReply({ content: `Image generation complete, but failed to attach image. Please check the URL manually: ${imageUrl}` });
                }
            return;
            case "STARTING":
                if (firstCall) {
                    await interaction.editReply({ content: 'Image generation started...' });
                    lastModifiedDateCache = null;
                }
            break;
            case "PENDING":
                if (lastModifiedDate !== lastModifiedDateCache) {
                    lastModifiedDateCache = lastModifiedDate;
                    try {
                        const imageResponse = await fetch(imageUrl);
                        const imageBuffer = await imageResponse.buffer();

                        await interaction.editReply({
                            content: 'Image generation in progress...',
                            files: [{
                                attachment: imageBuffer,
                                name: 'generated_image.png'
                            }],
                        });
                    } catch (fetchError) {
                        console.error("Failed to fetch and attach image:", fetchError);
                        await interaction.editReply({ content: `Image generation in progress...` });
                    }
                }
            break;
            case "FAILED":
                await interaction.editReply({ content: 'Image generation failed. Please try again. (Reason : '+error+').' });
                return;
            break;
        }

        if (status !== "COMPLETED") {
            await sleep(100);
            await updateStatus(interaction, imageId, imageUrl);
            return;
        }
    } catch (error) {
        console.error("Status update error:", error);
        await interaction.editReply({ content: "Failed to update image status." });
    }
}
