const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { buildNpEmbed, buildNpRows, attachNpCollector } = require('../utils/npUI');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song with controls.'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guild);

    if (!queue || !queue.songs.length) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Nothing is playing right now.'),
        ],
        flags: 64,
      });
    }

    const embed = buildNpEmbed(queue);
    const rows = buildNpRows(queue);

    const msg = await interaction.reply({
      embeds: [embed],
      components: rows,
      fetchReply: true,
    });

    attachNpCollector(msg, interaction.guild, interaction.client, async (updatedEmbed, updatedRows) => {
      await msg.edit({ embeds: [updatedEmbed], components: updatedRows }).catch(() => {});
    });
  },
};
