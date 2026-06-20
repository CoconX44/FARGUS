const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { buildNpEmbed, buildNpRows, attachNpCollector } = require('../utils/npUI');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the current song with playback controls'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild);

    if (!queue?.songs.length) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription('❌ Nothing is playing right now!')
      ], flags: 64 });
    }

    const msg = await interaction.reply({
      embeds: [buildNpEmbed(queue)],
      components: buildNpRows(queue),
      fetchReply: true,
    });

    attachNpCollector(msg, interaction.guild, client, payload => interaction.editReply(payload));
  },
};
