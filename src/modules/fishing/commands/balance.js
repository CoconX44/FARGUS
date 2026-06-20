const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadData, getUser } = require('../utils/userData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your fishing coin balance.')
    .addUserOption(o => o.setName('user').setDescription('Check another user').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const data   = loadData();
    const user   = getUser(data, target.id);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle(`🪙 ${target.username}'s Wallet`)
          .addFields(
            { name: 'Coins',        value: `🪙 ${user.coins}`,        inline: true },
            { name: 'Total Caught', value: `🐟 ${user.totalCaught || 0}`, inline: true },
            { name: 'Bag',          value: `🎒 ${user.bag.length}/50`, inline: true },
          ),
      ],
    });
  },
};
