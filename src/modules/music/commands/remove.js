const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a song from the queue by its position.')
    .addIntegerOption(opt =>
      opt
        .setName('position')
        .setDescription('Queue position to remove (1 = first song after the current one)')
        .setMinValue(1)
        .setRequired(true),
    ),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guild);

    if (!queue || queue.songs.length <= 1) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ The queue is empty.'),
        ],
        flags: 64,
      });
    }

    const position = interaction.options.getInteger('position', true);

    // songs[0] is current; removable range is 1..songs.length-1
    if (position >= queue.songs.length) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(
              `❌ Invalid position. Queue has ${queue.songs.length - 1} song(s) after the current one.`,
            ),
        ],
        flags: 64,
      });
    }

    try {
      const [removed] = queue.songs.splice(position, 1);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(`🗑️ Removed **${removed.name}** from position **${position}**.`),
        ],
      });
    } catch (err) {
      console.error('[remove] error:', err);
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
