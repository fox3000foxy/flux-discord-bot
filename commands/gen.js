const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;
let lastModifiedDateCache = null;

const apiCall = async (endpoint, params, spaceId) => {
    const url = new URL(`${API_URL}/${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    url.searchParams.append('spaceId', spaceId);
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'x-api-key': `${API_KEY}`,
        },
    });

    return response.json();
}

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
    async execute(interaction, spaceId, previousLoraNamesCache) {
        if (!spaceId) {
            await interaction.reply('Error: No space ID provided.');
            return;
        }

        const prompt = interaction.options.getString('prompt');

        if (prompt.length < 10) {
            let errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Error')
                .setDescription('Prompt must be at least 10 characters long.');
            await interaction.reply({ embeds: [errorEmbed] });
            return;
        }

        let previousLoraName = previousLoraNamesCache[spaceId]?.loraName || null;

        // Initial reply with an embed
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Image Generation')
            .setDescription(`Generating image in space ${spaceId}...`);

        await interaction.reply({ embeds: [embed] });

        const loraName = interaction.options.getString('loraname');

        try {
            if (loraName) {
                embed.setDescription(`Adding LoRA ${loraName} in space ${spaceId}...`);
                await interaction.editReply({ embeds: [embed] });

                if (loraName !== previousLoraName) {
                    if(previousLoraName !== null) {
                        await apiCall('removeLora', {}, spaceId);
                    }

                    const data = await apiCall('addLora', { loraName: encodeURIComponent(loraName) }, spaceId);
                    console.log(data);

                    embed.setDescription(`LoRA added: ${loraName} in space ${spaceId}`);
                    await interaction.editReply({ embeds: [embed] });

                    previousLoraNamesCache[spaceId] = { loraName: loraName };
                    previousLoraName = loraName;
                } else {
                    embed.setDescription(`LoRA already added: ${loraName} in space ${spaceId}`);
                    await interaction.editReply({ embeds: [embed] });
                }
            } else if (previousLoraName !== null) {
                embed.setDescription(`Removing LoRA in space ${spaceId}...`);
                await interaction.editReply({ embeds: [embed] });

                await apiCall('removeLora', {}, spaceId);
                delete previousLoraNamesCache[spaceId];
                previousLoraName = null;

                embed.setDescription('LoRA removed');
                await interaction.editReply({ embeds: [embed] });
            }

            const data = await apiCall('generateImageJob', { prompt: encodeURIComponent(prompt) }, spaceId);

            if (data.error) {
                embed.setColor(0xFF0000).setDescription(`Error: ${data.error}`);
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const { imageId, imageUrl } = data;
            console.log(data);
            await updateStatus(interaction, imageId, imageUrl, spaceId, embed, true);

        } catch (err) {
            console.error('Fetch error: ', err);
            embed.setColor(0xFF0000).setDescription(`An error occurred while processing your request: ${err}`);
            await interaction.editReply({ embeds: [embed] });
        }
    },
};

async function updateStatus(interaction, imageId, imageUrl, spaceId, embed, firstCall = false) {
    try {
        const stats = await apiCall(`status/${imageId}`, {}, spaceId);
        const { status } = stats;
        const lastModifiedDate = stats.lastModifiedDate || null;
        // console.log(status ,imageId);
        switch (status) {
            case "COMPLETED":
                embed.setImage(imageUrl).setDescription(`Image generation complete!`);
                await interaction.editReply({ embeds: [embed] });
            return;
            case "STARTING":
                if (firstCall) {
                    embed.setDescription('Image generation in progress...');
                    await interaction.editReply({ embeds: [embed] });
                    lastModifiedDateCache = null;
                }
            break;
            case "PENDING":
                if (lastModifiedDate !== lastModifiedDateCache) {
                    lastModifiedDateCache = lastModifiedDate;
                    embed.setImage(`${imageUrl}?status=${status}&randomHash=${Math.random()}`);
                    await interaction.editReply({ embeds: [embed] });
                }
            break;
        }

        if (status !== "COMPLETED") {
            await sleep(100);
            await updateStatus(interaction, imageId, imageUrl, spaceId, embed);
            return;
        }
    } catch (error) {
        console.error("Status update error:", error);
        embed.setColor(0xFF0000).setDescription("Failed to update image status.");
        await interaction.editReply({ embeds: [embed] });
    }
}