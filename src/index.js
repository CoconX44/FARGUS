require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

// Health-check server required by cloud platforms (Koyeb, Render, etc.)
http.createServer((_, res) => res.end('OK')).listen(process.env.PORT || 3000);
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');
const { setupMusic }         = require('./modules/music');
const { setup: setupSticky } = require('./modules/sticky');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

setupMusic(client);
setupSticky(client);
commandHandler(client);
eventHandler(client);

client.login(process.env.DISCORD_TOKEN);
