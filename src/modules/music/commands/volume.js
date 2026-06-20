const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set or check the playback volume')
    .addIntegerOption(opt =>
      opt.setName('level')
        .setDescription('Volume level (1–150)')
        .setMinValue(1)
        .setMaxValue(150)
    ),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild);

    if (!queue) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription('❌ Nothing is playing right now!')
      ], flags: 64 });
    }

    const level = interaction.options.getInteger('level');

    if (!level) {
      return interaction.reply({ embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setDescription(`🔊 Current volume: **${queue.volume}%**`)
      ]});
    }

    await client.distube.setVolume(interaction.guild, level);

    const emoji = level === 0 ? '🔇' : level < 50 ? '🔈' : level < 100 ? '🔉' : '🔊';
    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`${emoji} Volume set to **${level}%**`)
    ]});
  },
};
