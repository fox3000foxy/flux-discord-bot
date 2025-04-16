const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

// Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Store commands in a collection
client.commands = new Collection();

// Load commands from files
async function loadCommands(client) {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Register commands to Discord API
async function registerCommands(client) {
    try {
        const commands = client.application?.commands;
        for (const command of client.commands.values()) {
            await commands?.create({
                ...command.data.toJSON(), 
                integration_types: [0, 1],
                contexts: [0, 1, 2]
            });
        }
        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error('Failed to register application commands:', error);
    }
}

// Event: Client is ready
client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await loadCommands(client);
    await registerCommands(client);
});

// Event: Interaction Create (Slash Commands)
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        await interaction.reply({ content: 'Command not found!', ephemeral: true });
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);

// Error handling
process.on('uncaughtException', error => {
    console.error('🚨 Uncaught Exception: An error occurred!', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.warn('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});
