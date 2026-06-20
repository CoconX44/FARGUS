const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

/**
 * Parses time input as either "m:ss" / "h:mm:ss" format or raw seconds.
 * @param {string} input
 * @returns {number|null}  seconds, or null if invalid
 */
function parseTime(input) {
  const trimmed = input.trim();

  // Format: [[h:]m:]s  e.g. "1:30", "1:02:30", "90"
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  const parts = trimmed.split(':').map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 2) {
    // mm:ss
    const [m, s] = parts;
    if (s < 0 || s >= 60) return null;
    return m * 60 + s;
  }

  if (parts.length === 3) {
    // hh:mm:ss
    const [h, m, s] = parts;
    if (m < 0 || m >= 60 || s < 0 || s >= 60) return null;
    return h * 3600 + m * 60 + s;
  }

  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek to a position in the current song.')
    .addStringOption(opt =>
      opt
        .setName('time')
        .setDescription('Time to seek to, e.g. 1:30 or 90 (seconds)')
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

    const timeStr = interaction.options.getString('time', true);
    const seconds = parseTime(timeStr);

    if (seconds === null || seconds < 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Invalid time format. Use `1:30` or `90` (seconds).'),
        ],
        flags: 64,
      });
    }

    const duration = queue.songs[0]?.duration ?? 0;
    if (duration > 0 && seconds > duration) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(
              `❌ Cannot seek past the song duration (**${queue.songs[0].formattedDuration}**).`,
            ),
        ],
        flags: 64,
      });
    }

    try {
      await queue.seek(seconds);

      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      const formatted = `${m}:${String(s).padStart(2, '0')}`;

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(`⏩ Seeked to **${formatted}** in **${queue.songs[0].name}**.`),
        ],
      });
    } catch (err) {
      console.error('[seek] error:', err);
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
