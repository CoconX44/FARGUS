const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the upcoming songs in the queue.'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guild);

    if (!queue || queue.songs.length <= 1) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Not enough songs in the queue to shuffle.'),
        ],
        flags: 64,
      });
    }

    try {
      queue.shuffle();
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(`🔀 Shuffled **${queue.songs.length - 1}** song(s) in the queue.`),
        ],
      });
    } catch (err) {
      console.error('[shuffle] error:', err);
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
