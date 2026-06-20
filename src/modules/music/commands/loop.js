const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const LOOP_MODES = { off: 0, song: 1, queue: 2 };
const LOOP_LABELS = { 0: 'Off', 1: 'Song 🔂', 2: 'Queue 🔁' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the loop mode for the queue.')
    .addStringOption(opt =>
      opt
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: '🔁 Off', value: 'off' },
          { name: '🔂 Song', value: 'song' },
          { name: '🔁 Queue', value: 'queue' },
        ),
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

    const modeName = interaction.options.getString('mode', true);
    const modeValue = LOOP_MODES[modeName];

    try {
      queue.setRepeatMode(modeValue);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(`🔁 Loop mode set to **${LOOP_LABELS[modeValue]}**.`),
        ],
      });
    } catch (err) {
      console.error('[loop] error:', err);
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
