const { EmbedBuilder } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'sticky.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return {}; }
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function setup(client) {
  client.stickyData = loadData();

  client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const guildSticky = client.stickyData[message.guild.id];
    if (!guildSticky) return;
    const sticky = guildSticky[message.channel.id];
    if (!sticky) return;

    // delete previous sticky message
    if (sticky.messageId) {
      const old = await message.channel.messages.fetch(sticky.messageId).catch(() => null);
      if (old) await old.delete().catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setDescription(sticky.content)
      .setFooter({ text: '📌 Sticky Message' });

    const sent = await message.channel.send({ embeds: [embed] }).catch(() => null);
    if (sent) {
      sticky.messageId = sent.id;
      saveData(client.stickyData);
    }
  });
}

module.exports = { setup, loadData, saveData };
