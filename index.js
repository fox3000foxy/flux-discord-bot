const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const https = require('https');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.on('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag} !`);

    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    try {
        const commands = client.application?.commands;
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                await commands?.create({
                    ...command.data.toJSON(),
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

    const allowedUserIds = ["724847846897221642", "1141909667790979082", "843808047042134026"];
    if (!allowedUserIds.includes(interaction.user.id)) {
        await interaction.reply({ content: 'Vous n\'êtes pas autorisé à utiliser ce bot ! Veuillez contacter <@724847846897221642> pour être ajouté à la liste blanche.', ephemeral: true });
        return;
    }

    const { commandName } = interaction;
    const commandsPath = path.join(__dirname, 'commands');

    try {
        const command = require(path.join(commandsPath, `${commandName}.js`));

        await command.execute(interaction).catch(err => {
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
});

process.on('unhandledRejection', (reason, promise) => {
    console.warn('⚠️ Rejet non géré à :', promise, 'raison :', reason);
});
