import { SlashCommandBuilder, CommandInteraction, AutocompleteInteraction } from 'discord.js';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;
let lastModifiedDateCache: string | null = null;

interface ImageStatus {
    status: string;
    lastModifiedDate?: string | null;
    error?: string | null;
}

async function updateStatus(
    interaction: CommandInteraction, 
    imageId: string, 
    imageUrl: string, 
    firstCall: boolean = false
): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/status/${imageId}`, {
            method: 'GET',
            headers: {
                'x-api-key': `${API_KEY}`,
            },
        });
        const stats: ImageStatus = await response.json();
        const { status, lastModifiedDate, error } = stats;
        console.log(stats)

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

            case "QUEUED":
                await interaction.editReply({ content: 'Image is in queue' });
                break;

            case "PENDING":
                if (lastModifiedDate !== lastModifiedDateCache) {
                    if (lastModifiedDate !== undefined) {
                        lastModifiedDateCache = lastModifiedDate;
                    }
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
                await interaction.editReply({ content: `Image generation failed. Please try again. (Reason : ${error}).` });
                return;
        }

        if (status !== "COMPLETED") {
            await sleep(100);
            await updateStatus(interaction, imageId, imageUrl);
        }
    } catch (error) {
        console.error("Status update error:", error);
        await interaction.editReply({ content: "Failed to update image status." });
    }
}

const command = {
    //@ts-ignore
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

    async execute(interaction: CommandInteraction) {
        //@ts-ignore
        const prompt = "IMG_5678.HEIC, " + interaction.options.getString('prompt', true);
        //@ts-ignore
        const loraName = interaction.options.getString('loraname');

        // EXCEPTIONAL PROHIBITION
        interface Restrictions {
            [key: string]: string[];
        }
        const restrictedLoras: Restrictions = JSON.parse(
            fs.readFileSync(path.join(__dirname, '..', '..', 'restrictions.json'), 'utf8')
        );

        if (loraName) {
            const userId = interaction.user.id;
            const allowedIds = restrictedLoras[loraName.trim()];
            
            if (allowedIds) {
                console.log(`LoRA ${loraName} has restricted IDs: ${allowedIds}`);
                if (!allowedIds.includes(userId)) {
                    console.log(`User ${userId} is not allowed to use LoRA ${loraName}.`);
                    await interaction.reply({ content: `You are not allowed to use this LoRA.`, ephemeral: true });
                    return;
                }
            }
        }

        if (prompt.length < 10) {
            await interaction.reply({ content: 'Prompt must be at least 10 characters long.', ephemeral: true });
            return;
        }

        await interaction.reply({ content: 'Generating image...' });

        try {
            let apiUrl = `${API_URL}/generateImage?prompt=${encodeURIComponent(prompt)}`;
            if (loraName) {
                apiUrl += `&loraName=${encodeURIComponent(loraName)}`;
                // await interaction.editReply({ content: `Generating image with LoRA: ${loraName}...` });
            } else {
                // await interaction.editReply({ content: 'Generating image without LoRA...' });
            }

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'x-api-key': `${API_KEY}`,
                },
            });

            const data = await response.json();

            if ('error' in data) {
                await interaction.editReply({ content: `Error: ${data.error}` });
                return;
            }

            const { imageId, imageUrl } = data;
            await updateStatus(interaction, imageId, imageUrl, true);

        } catch (err: any) {
            let errorMessage = err.message;
            if (err.code === 'ECONNREFUSED') {
                errorMessage = "The Weights.gg Unofficial API server is down (Connection Refused). Please ensure it is running and accessible.";
            } else if (err instanceof fetch.FetchError) {
                errorMessage = `Failed to fetch image: ${err.message}. Please check the API URL and your network connection.`;
            } else {
                errorMessage = `An unexpected error occurred: ${err.message}`;
            }
            console.error('Fetch error: ', errorMessage);
            await interaction.editReply({ content: `An error occurred: ${errorMessage}` });
        }
    }
};

export default command;