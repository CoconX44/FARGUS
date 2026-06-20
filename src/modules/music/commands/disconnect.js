const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect the bot from the voice channel and clear the queue.'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guild);

    if (!queue) {
      // Try direct voice disconnect even without an active queue
      const voiceChannel = interaction.guild.members.me?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('❌ I am not in a voice channel.'),
          ],
          flags: 64,
        });
      }
    }

    try {
      if (queue) {
        await queue.stop();
      } else {
        interaction.guild.members.me?.voice?.disconnect();
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFEE75C)
            .setDescription('👋 Disconnected from the voice channel.'),
        ],
      });
    } catch (err) {
      console.error('[disconnect] error:', err);
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
