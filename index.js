const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const https = require('https');
require('dotenv').config();
const sleep = ms => new Promise(r => setTimeout(r, ms));


const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

let spaceIds = []; // Array to hold multiple space IDs
let previousLoraNamesCache = {}; // Dictionary to hold previous Lora names for each space


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

async function allocateSpace() {
    try {
        const response = await apiCall('allocateSpace', {}, null);

        if (response.success) {
            return response.spaceId;
        } else {
            throw new Error(`Failed to allocate space: ${response.error}`);
        }
    } catch (error) {
        console.error("Error allocating space:", error);
        throw error;
    }
}

async function allocateMultipleSpaces(numSpaces) {
    const spaces = [];
    for (let i = 0; i < numSpaces; i++) {
        try {
            const spaceId = await allocateSpace();
            spaces.push(spaceId);
            console.log(`Allocated space ${i + 1} with ID: ${spaceId}`);
        } catch (error) {
            console.error(`Failed to allocate space ${i + 1}:`, error);
            // Consider how to handle allocation failures.  Retry? Exit?
        }
    }
    return spaces;
}

client.on('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag} !`);

    const numSpaces = 1; // Define the number of spaces you want to allocate
    
    let result = false;
    while(!result) {
        result = await fetch(`${API_URL}/health`, {}, null).then(res => res.ok).catch(err => false);
        await sleep(100);        
    }

    spaceIds = await allocateMultipleSpaces(numSpaces);

    if (spaceIds.length === 0) {
        console.error("Échec de l'allocation des espaces. Sortie.");
        process.exit(1);
    }

    // Initialize previousLoraNamesCache for each space
    spaceIds.forEach(spaceId => {
        previousLoraNamesCache[spaceId] = {};
    });

    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    // Delete all existing commands
    // try {
    //     const commands = client.application?.commands;
    //     if (commands) {
    //         const existingCommands = await commands.fetch();
    //         for (const [key, command] of existingCommands) {
    //             await commands.delete(command.id);
    //         }
    //         console.log('Existing commands deleted.');
    //     }
    // } catch (error) {
    //     console.error('Failed to delete existing commands:', error);
    // }

    try {
        const commands = client.application?.commands;
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                await commands?.create({
                    ...command.data.toJSON(), 
                    // integration_types: [0, 1],
                    // contexts: [0, 1, 2]
                });
            } else {
                console.log(`[WARNING] La commande à ${filePath} ne possède pas les propriétés "data" ou "execute" requises.`);
            }
        }
        console.log('Commandes enregistrées !');
    } catch (error) {
        console.error('Échec de l\'enregistrement des commandes :', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    // const allowedUserIds = ["724847846897221642", "1141909667790979082", "843808047042134026"];
    // if (!allowedUserIds.includes(interaction.user.id)) {
    //     await interaction.reply({ content: 'Vous n\'êtes pas autorisé à utiliser ce bot ! Veuillez contacter <@724847846897221642> pour être ajouté à la liste blanche.', ephemeral: true });
    //     return;
    // }

    const { commandName } = interaction;
    const commandsPath = path.join(__dirname, 'commands');

    try {
        const command = require(path.join(commandsPath, `${commandName}.js`));

        // Select a space ID (e.g., round-robin or based on user ID)
        const selectedSpaceId = spaceIds[Math.floor(Math.random() * spaceIds.length)]; // Example: random selection

        await command.execute(interaction, selectedSpaceId, previousLoraNamesCache).catch(err => {
            console.error(`Erreur lors de l'exécution de la commande ${commandName} :`, err);
            interaction.reply({ content: 'Une erreur s\'est produite lors de l\'exécution de cette commande !', ephemeral: true });
        });
    } catch (error) {
        console.error(`Commande ${commandName} introuvable :`, error);
        interaction.reply({ content: 'Commande introuvable !', ephemeral: true });
    }
});

client.on('messageCreate', msg => {
    if (msg.content === 'ping') {
        msg.reply('Pong !');
    }
});

client.login(process.env.DISCORD_TOKEN);

process.on('uncaughtException', (error) => {
    console.error('🚨 Exception non gérée : Une erreur s\'est produite !', error);
    // Consider if you want to increment metrics here, but ensure it doesn't crash the process further
});

process.on('unhandledRejection', (reason, promise) => {
    console.warn('⚠️ Rejet non géré à :', promise, 'raison :', reason);
});