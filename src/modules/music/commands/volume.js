const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the playback volume (1–150).')
    .addIntegerOption(opt =>
      opt
        .setName('level')
        .setDescription('Volume level (1–150, default is 100)')
        .setMinValue(1)
        .setMaxValue(150)
        .setRequired(true),
    ),

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

    const level = interaction.options.getInteger('level', true);

    try {
      queue.setVolume(level);
      const emoji = level === 0 ? '🔇' : level < 50 ? '🔉' : '🔊';
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(`${emoji} Volume set to **${level}%**.`),
        ],
      });
    } catch (err) {
      console.error('[volume] error:', err);
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
