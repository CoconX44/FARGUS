const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the loop mode')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: '🚫 Off', value: '0' },
          { name: '🔂 Song', value: '1' },
          { name: '🔁 Queue', value: '2' },
        )
    ),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guild);

    if (!queue) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xED4245).setDescription('❌ Nothing is playing right now!')
      ], flags: 64 });
    }

    const mode = parseInt(interaction.options.getString('mode'));
    await client.distube.setRepeatMode(interaction.guild, mode);

    const modeLabels = ['🚫 Loop Off', '🔂 Loop Song', '🔁 Loop Queue'];
    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setDescription(`Set loop mode to: **${modeLabels[mode]}**`)
    ]});
  },
};
