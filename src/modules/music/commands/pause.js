const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Toggle pause/resume for the current song.'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guild);

    if (!queue) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Nothing is playing right now.'),
        ],
        flags: 64,
      });
    }

    try {
      if (queue.paused) {
        queue.resume();
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setDescription(`▶️ Resumed **${queue.songs[0].name}**.`),
          ],
        });
      } else {
        queue.pause();
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setDescription(`⏸️ Paused **${queue.songs[0].name}**.`),
          ],
        });
      }
    } catch (err) {
      console.error('[pause] error:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ \`${err.message ?? err}\``),
        ],
        flags: 64,
      });
    }
  },
};
