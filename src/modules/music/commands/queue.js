const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { buildQueueEmbed, buildQueueRows, attachQueueCollector } = require('../utils/queueUI');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the song queue with controls'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild);
    if (!queue?.songs.length) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription('❌ The queue is empty!')
      ], flags: 64 });
    }

    const msg = await interaction.reply({
      embeds: [buildQueueEmbed(queue, 1)],
      components: buildQueueRows(queue, 1),
      fetchReply: true,
    });

    attachQueueCollector(msg, interaction.guild, client, payload => interaction.editReply(payload));
  },
};
