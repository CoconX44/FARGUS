const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadData, getUser, BAG_LIMIT } = require('../utils/userData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bag')
    .setDescription('View the fish in your bag.')
    .addUserOption(o => o.setName('user').setDescription('View another user\'s bag').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const data   = loadData();
    const user   = getUser(data, target.id);

    if (!user.bag.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x95a5a6)
          .setDescription(`🎒 ${target.id === interaction.user.id ? 'Your' : `**${target.username}'s**`} bag is empty! Use \`/fish\` to catch something.`)],
        flags: 64,
      });
    }

    const grouped = {};
    let totalValue = 0;
    for (const f of user.bag) {
      if (!grouped[f.id]) grouped[f.id] = { name: f.name, emoji: f.emoji, count: 0, value: 0 };
      grouped[f.id].count++;
      grouped[f.id].value += f.value;
      totalValue += f.value;
    }

    const lines = Object.values(grouped)
      .sort((a, b) => b.value - a.value)
      .map(g => `${g.emoji} **${g.name}** ×${g.count} — 🪙 ${g.value}`);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`🎒 ${target.username}'s Fish Bag`)
          .setDescription(lines.join('\n'))
          .addFields(
            { name: 'Slots',      value: `${user.bag.length}/${BAG_LIMIT}`, inline: true },
            { name: 'Sell Value', value: `🪙 ${totalValue}`,               inline: true },
            { name: 'Balance',    value: `🪙 ${user.coins}`,               inline: true },
          ),
      ],
    });
  },
};
