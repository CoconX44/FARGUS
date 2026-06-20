const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadData } = require('../utils/userData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fishtop')
    .setDescription('Fishing leaderboard — top 10 richest fishers.'),

  async execute(interaction) {
    const data   = loadData();
    const sorted = Object.entries(data)
      .filter(([, u]) => u.coins > 0 || u.totalCaught > 0)
      .sort(([, a], [, b]) => b.coins - a.coins)
      .slice(0, 10);

    if (!sorted.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x95a5a6).setDescription('No fishers yet! Use `/fish` to start.')],
        flags: 64,
      });
    }

    await interaction.deferReply();

    const medals = ['🥇', '🥈', '🥉'];
    const lines  = await Promise.all(
      sorted.map(async ([userId, u], i) => {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        const name   = member?.displayName ?? `User ${userId.slice(-4)}`;
        const prefix = medals[i] ?? `**${i + 1}.**`;
        return `${prefix} ${name} — 🪙 ${u.coins} coins | 🐟 ${u.totalCaught || 0} caught`;
      }),
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle('🏆 Fishing Leaderboard')
          .setDescription(lines.join('\n')),
      ],
    });
  },
};
