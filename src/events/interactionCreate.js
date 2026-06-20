const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error in command ${interaction.commandName}:`, error);
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('❌ Command Error')
        .setDescription(`Something went wrong: \`${error.message}\``);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], flags: 64 });
      } else {
        await interaction.reply({ embeds: [embed], flags: 64 });
      }
    }
  },
};
