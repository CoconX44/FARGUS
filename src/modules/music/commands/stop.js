const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music and clear the queue'),

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

    await client.distube.stop(interaction.guild);

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription('⏹️ Stopped the music and cleared the queue.')
    ]});
  },
};
