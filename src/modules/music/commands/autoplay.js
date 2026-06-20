const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggle autoplay of related songs when the queue ends.'),

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
      const newState = interaction.client.distube.toggleAutoplay(interaction.guild);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(newState ? 0x57F287 : 0xFEE75C)
            .setDescription(
              newState
                ? '🔄 Autoplay is now **enabled**. Related songs will play when the queue ends.'
                : '🔄 Autoplay is now **disabled**.',
            ),
        ],
      });
    } catch (err) {
      console.error('[autoplay] error:', err);
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
