require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');
const { setupMusic }         = require('./modules/music');
const { setup: setupSticky } = require('./modules/sticky');

async function main() {
  // Download yt-dlp binary before bot starts so it's ready for first play
  try {
    const { YTDlpWrap } = require('yt-dlp-wrap');
    console.log('📥 Downloading yt-dlp...');
    await YTDlpWrap.downloadFromGithub();
    console.log('✅ yt-dlp ready');
  } catch (err) {
    console.warn('⚠️  yt-dlp download failed, YouTube may not work:', err.message);
  }

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
}

main();
