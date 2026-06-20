const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause or resume the current song'),

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

    if (queue.paused) {
      await client.distube.resume(interaction.guild);
      await interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0x57F287).setDescription('▶️ Resumed the music.')
      ]});
    } else {
      await client.distube.pause(interaction.guild);
      await interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xFEE75C).setDescription('⏸️ Paused the music.')
      ]});
    }
  },
};
