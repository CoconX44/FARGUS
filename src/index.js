require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');
const { setupMusic }   = require('./modules/music');
const { setup: setupSticky } = require('./modules/sticky');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // requires Privileged Intent toggle in Dev Portal
  ],
});

client.commands = new Collection();

// ── Modules ────────────────────────────────────────────────────────────────
setupMusic(client);
setupSticky(client);
// setupModeration(client);   ← add future modules here
// setupFun(client);

// ── Core handlers ──────────────────────────────────────────────────────────
commandHandler(client);
eventHandler(client);

client.login(process.env.DISCORD_TOKEN);
