const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a song from the queue by its position')
    .addIntegerOption(opt =>
      opt.setName('position')
        .setDescription('Song position in queue (use /queue to see positions)')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild);

    if (!queue || !queue.songs.length) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription('❌ The queue is empty!')
      ], flags: 64 });
    }

    const pos = interaction.options.getInteger('position');

    if (pos >= queue.songs.length) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription(`❌ No song at position #${pos}. Queue has ${queue.songs.length - 1} upcoming songs.`)
      ], flags: 64 });
    }

    const removed = queue.songs[pos];
    queue.songs.splice(pos, 1);

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0xFEE75C)
        .setDescription(`🗑️ Removed **${removed.name}** from the queue.`)
    ]});
  },
};
