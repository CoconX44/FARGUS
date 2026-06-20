const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek to a specific time in the current song')
    .addStringOption(opt =>
      opt.setName('time')
        .setDescription('Time to seek to (e.g. 1:30 or 90)')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild);

    if (!queue) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription('❌ Nothing is playing right now!')
      ], flags: 64 });
    }

    const timeStr = interaction.options.getString('time');
    let seconds = 0;

    if (timeStr.includes(':')) {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
      else if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      seconds = parseInt(timeStr);
    }

    if (isNaN(seconds) || seconds < 0) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription('❌ Invalid time format. Use `1:30` or `90` (seconds).')
      ], flags: 64 });
    }

    await client.distube.seek(interaction.guild, seconds);

    const fmt = new Date(seconds * 1000).toISOString().substr(11, 8).replace(/^00:/, '');
    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`⏩ Seeked to **${fmt}**`)
    ]});
  },
};
