const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song or multiple songs.')
    .addIntegerOption(opt =>
      opt
        .setName('amount')
        .setDescription('Number of songs to skip (default: 1)')
        .setMinValue(1)
        .setRequired(false),
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

    const amount = interaction.options.getInteger('amount') ?? 1;

    try {
      if (amount === 1) {
        const skipped = queue.songs[0];
        await queue.skip();
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setDescription(`⏭️ Skipped **${skipped.name}**.`),
          ],
        });
      }

      // Skip multiple: remove songs[1..amount-1] then skip current
      const toRemove = Math.min(amount - 1, queue.songs.length - 1);
      if (toRemove > 0) queue.songs.splice(1, toRemove);

      const skipped = queue.songs[0];
      if (queue.songs.length > 1) {
        await queue.skip();
      } else {
        await queue.stop();
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(`⏭️ Skipped **${amount}** song(s) including **${skipped.name}**.`),
        ],
      });
    } catch (err) {
      console.error('[skip] error:', err);
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
