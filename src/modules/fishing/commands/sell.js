const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadData, saveData, getUser } = require('../utils/userData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Sell fish from your bag for coins.')
    .addStringOption(o =>
      o.setName('type')
        .setDescription('Fish name to sell, or "all" to sell everything')
        .setRequired(false)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const type   = (interaction.options.getString('type') ?? 'all').toLowerCase();
    const data   = loadData();
    const user   = getUser(data, userId);

    if (!user.bag.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('🎒 Your bag is empty!')],
        flags: 64,
      });
    }

    const toSell   = type === 'all'
      ? [...user.bag]
      : user.bag.filter(f => f.name.toLowerCase().includes(type));
    const keep = user.bag.filter(f => !toSell.includes(f));

    if (!toSell.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245)
          .setDescription(`❌ No fish matching **${type}** in your bag.`)],
        flags: 64,
      });
    }

    const earned = toSell.reduce((s, f) => s + f.value, 0);
    user.bag    = keep;
    user.coins  = (user.coins || 0) + earned;
    saveData(data);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('💰 Fish Sold!')
          .setDescription(`Sold **${toSell.length}** fish for 🪙 **${earned} coins**`)
          .addFields(
            { name: 'New Balance', value: `🪙 ${user.coins}`, inline: true },
            { name: 'Bag',         value: `${user.bag.length} fish left`, inline: true },
          ),
      ],
    });
  },
};
