const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect the bot from the voice channel'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild);

    if (queue) {
      await client.distube.stop(interaction.guild);
    }

    const voiceChannel = interaction.guild.members.me.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription('❌ I\'m not in a voice channel!')
      ], flags: 64 });
    }

    voiceChannel.leave?.() || interaction.guild.members.me.voice.disconnect();

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setDescription('👋 Disconnected from the voice channel. Bye!')
    ]});
  },
};
