const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggle autoplay — keeps playing related songs when queue ends'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild);

    if (!queue) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription('❌ Nothing is playing right now!')
      ], flags: 64 });
    }

    const newState = await client.distube.toggleAutoplay(interaction.guild);

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setColor(newState ? 0x57F287 : 0xED4245)
        .setDescription(`🤖 Autoplay is now **${newState ? 'ON' : 'OFF'}**`)
    ]});
  },
};
