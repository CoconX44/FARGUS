const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the current queue'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild);

    if (!queue || queue.songs.length < 2) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription('❌ Not enough songs in the queue to shuffle!')
      ], flags: 64 });
    }

    await client.distube.shuffle(interaction.guild);

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`🔀 Shuffled **${queue.songs.length - 1}** songs in the queue!`)
    ]});
  },
};
