const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { buildQueueEmbed, buildQueueRows, attachQueueCollector } = require('../utils/queueUI');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Display the current song queue.'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guild);

    if (!queue || !queue.songs.length) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ The queue is empty.'),
        ],
        flags: 64,
      });
    }

    const embed = buildQueueEmbed(queue, 1);
    const rows = buildQueueRows(queue, 1);

    const msg = await interaction.reply({
      embeds: [embed],
      components: rows,
      fetchReply: true,
    });

    attachQueueCollector(msg, interaction.guild, interaction.client, async (updatedEmbed, updatedRows) => {
      await msg.edit({ embeds: [updatedEmbed], components: updatedRows }).catch(() => {});
    }, 1);
  },
};
