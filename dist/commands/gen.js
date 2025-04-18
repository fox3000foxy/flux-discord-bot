"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;
let lastModifiedDateCache = null;
async function updateStatus(interaction, imageId, imageUrl, firstCall = false) {
    try {
        const response = await (0, node_fetch_1.default)(`${API_URL}/status/${imageId}`, {
            method: 'GET',
            headers: {
                'x-api-key': `${API_KEY}`,
            },
        });
        const stats = await response.json();
        const { status, lastModifiedDate, error } = stats;
        switch (status) {
            case "COMPLETED":
                try {
                    const imageResponse = await (0, node_fetch_1.default)(imageUrl);
                    const imageBuffer = await imageResponse.buffer();
                    await interaction.editReply({
                        content: 'Image generation complete!',
                        files: [{
                                attachment: imageBuffer,
                                name: 'generated_image.png'
                            }],
                    });
                }
                catch (fetchError) {
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
                        const imageResponse = await (0, node_fetch_1.default)(imageUrl);
                        const imageBuffer = await imageResponse.buffer();
                        await interaction.editReply({
                            content: 'Image generation in progress...',
                            files: [{
                                    attachment: imageBuffer,
                                    name: 'generated_image.png'
                                }],
                        });
                    }
                    catch (fetchError) {
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
    }
    catch (error) {
        console.error("Status update error:", error);
        await interaction.editReply({ content: "Failed to update image status." });
    }
}
const command = {
    //@ts-ignore
    data: new discord_js_1.SlashCommandBuilder()
        .setName('gen')
        .setDescription('Replies with a generated image!')
        .addStringOption(option => option.setName('prompt')
        .setDescription('The image prompt')
        .setRequired(true))
        .addStringOption(option => option.setName('loraname')
        .setDescription('The name of the LoRA to add')
        .setRequired(false)
        .setAutocomplete(true)),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        try {
            const response = await (0, node_fetch_1.default)(`${API_URL}/search-loras?query=${focusedValue}`, {
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
            const filtered = loras.filter(lora => lora.name.toLowerCase().startsWith(focusedValue.toLowerCase()));
            await interaction.respond(filtered.map(lora => ({ name: lora.name, value: lora.name })));
        }
        catch (error) {
            console.error("Autocomplete fetch error:", error);
        }
    },
    async execute(interaction) {
        //@ts-ignore
        const prompt = "IMG_5678.HEIC," + interaction.options.getString('prompt', true);
        //@ts-ignore
        const loraName = interaction.options.getString('loraname');
        const restrictedLoras = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'restrictions.json'), 'utf8'));
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
            }
            else {
                // await interaction.editReply({ content: 'Generating image without LoRA...' });
            }
            const response = await (0, node_fetch_1.default)(apiUrl, {
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
        }
        catch (err) {
            let errorMessage = err.message;
            if (err.code === 'ECONNREFUSED') {
                errorMessage = "The Weights.gg Unofficial API server is down (Connection Refused). Please ensure it is running and accessible.";
            }
            else if (err instanceof node_fetch_1.default.FetchError) {
                errorMessage = `Failed to fetch image: ${err.message}. Please check the API URL and your network connection.`;
            }
            else {
                errorMessage = `An unexpected error occurred: ${err.message}`;
            }
            console.error('Fetch error: ', errorMessage);
            await interaction.editReply({ content: `An error occurred: ${errorMessage}` });
        }
    }
};
exports.default = command;
