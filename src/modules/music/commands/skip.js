const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of songs to skip (default: 1)')
        .setMinValue(1)
    ),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild);

    if (!queue) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription('❌ Nothing is playing right now!')
      ], flags: 64 });
    }

    if (!interaction.member.voice.channel) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription('❌ You must be in a voice channel!')
      ], flags: 64 });
    }

    const amount = interaction.options.getInteger('amount') || 1;
    const skipped = queue.songs[0];

    try {
      if (amount > 1 && queue.songs.length > 1) {
        queue.songs.splice(1, amount - 1);
      }
      await client.distube.skip(interaction.guild);

      await interaction.reply({ embeds: [
        new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('⏭️ Skipped')
          .setDescription(`Skipped **${skipped.name}**`)
          .addFields({ name: 'Up next', value: queue.songs[0]?.name || 'Nothing', inline: true })
      ]});
    } catch (err) {
      await interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription(`❌ ${err.message}`)
      ], flags: 64 });
    }
  },
};
