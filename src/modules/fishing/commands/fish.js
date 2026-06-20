const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadData, saveData, getUser, BAG_LIMIT, COOLDOWN_MS } = require('../utils/userData');
const { pickRandomFish, RARITY_COLORS, RARITY_LABELS } = require('../utils/fishTypes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fish')
    .setDescription('Cast your fishing rod and catch a fish!'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const data   = loadData();
    const user   = getUser(data, userId);
    const now    = Date.now();

    const elapsed = now - (user.lastFished || 0);
    if (elapsed < COOLDOWN_MS) {
      const left = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245)
          .setDescription(`🎣 Your line is still in the water! Wait **${left}s** before casting again.`)],
        flags: 64,
      });
    }

    if (user.bag.length >= BAG_LIMIT) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245)
          .setDescription(`🎒 Your bag is full! **(${BAG_LIMIT}/${BAG_LIMIT})** — use \`/sell all\` to make room.`)],
        flags: 64,
      });
    }

    await interaction.deferReply();
    await new Promise(r => setTimeout(r, 1500));

    const caught = pickRandomFish();
    user.bag.push({ id: caught.id, name: caught.name, emoji: caught.emoji, weight: caught.weight, value: caught.value });
    user.totalCaught = (user.totalCaught || 0) + 1;
    user.lastFished  = now;
    saveData(data);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(RARITY_COLORS[caught.rarity])
          .setTitle(`${caught.emoji} You caught a **${caught.name}**!`)
          .addFields(
            { name: 'Rarity',  value: RARITY_LABELS[caught.rarity], inline: true },
            { name: 'Weight',  value: `${caught.weight} kg`,        inline: true },
            { name: 'Value',   value: `🪙 ${caught.value} coins`,   inline: true },
          )
          .setFooter({ text: `Bag: ${user.bag.length}/${BAG_LIMIT} | Total caught: ${user.totalCaught}` }),
      ],
    });
  },
};
