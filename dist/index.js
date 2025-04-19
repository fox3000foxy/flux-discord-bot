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
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || "",
    API_URL: process.env.API_URL || "",
    API_KEY: process.env.API_KEY || "",
};
// Initialize Discord Client
const client = new discord_js_1.Client({ intents: [] });
// Store commands in a collection
client.commands = new discord_js_1.Collection();
// Load commands from files
async function loadCommands(client) {
    const commandsPath = path.join(__dirname, "commands");
    const commandFiles = fs.readdirSync(commandsPath);
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s))).then((m) => m.default || m);
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
            console.log(`Loaded command: ${command.data.name}`);
        }
        else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}
// Register commands to Discord API
async function registerCommands(client) {
    try {
        const commands = client.application?.commands;
        if (!commands)
            return;
        for (const command of client.commands.values()) {
            await commands.create({
                ...command.data.toJSON(),
                integration_types: [0, 1],
                contexts: [0, 1, 2],
            });
        }
        console.log("Successfully registered application commands.");
    }
    catch (error) {
        console.error("Failed to register application commands:", error);
    }
}
// Event: Client is ready
client.on("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    await loadCommands(client);
    await registerCommands(client);
});
// Event: Interaction Create (Slash Commands)
client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (process.env.BLACKLIST_KEY) {
            const blacklistedIds = await (0, node_fetch_1.default)("https://aventuros.fr/api/discord/blacklistbot/list", {
                headers: {
                    Authorization: process.env.BLACKLIST_KEY,
                },
            })
                .then(async (response) => {
                const data = (await response.json());
                return data;
            })
                .catch((error) => {
                if (error instanceof Error) {
                    console.error(error);
                }
                return [];
            });
            if (blacklistedIds.includes(interaction.user.id)) {
                return interaction.reply({
                    content: "🔧 The bot is currently in maintenance. Please try again later.",
                    ephemeral: true,
                });
            }
        }
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            await interaction.reply({
                content: "Command not found!",
                ephemeral: true,
            });
            return;
        }
        try {
            await command.execute(interaction);
        }
        catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);
            await interaction.reply({
                content: "There was an error while executing this command!",
                ephemeral: true,
            });
        }
    }
    else if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        try {
            await command.autocomplete(interaction);
        }
        catch (error) {
            console.error(`Error executing autocomplete for ${interaction.commandName}:`, error);
        }
    }
});
// Log in to Discord with your client's token
client.login(config.DISCORD_TOKEN);
// Error handling
process.on("uncaughtException", (error) => {
    console.error("🚨 Uncaught Exception: An error occurred!", error);
});
process.on("unhandledRejection", (reason, promise) => {
    console.warn("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
});
