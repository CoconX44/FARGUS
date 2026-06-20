const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const playdl = require('play-dl');

const RESULT_COUNT = 5;
const COLLECTOR_TIMEOUT = 30_000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search YouTube for a song and pick from the top results.')
    .addStringOption(opt =>
      opt
        .setName('query')
        .setDescription('Search query')
        .setRequired(true),
    ),

  async execute(interaction) {
    const query = interaction.options.getString('query', true);
    const member = interaction.member;
    const voiceChannel = member.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ You must be in a voice channel to use `/search`!',
        flags: 64,
      });
    }

    await interaction.deferReply();

    try {
      const results = await playdl.search(query, { source: { youtube: 'video' }, limit: RESULT_COUNT });

      if (!results || results.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setDescription(`❌ No YouTube results found for **${query}**.`),
          ],
        });
      }

      // Build description list
      const description = results
        .map(
          (r, i) =>
            `**${i + 1}.** [${r.title}](${r.url})\n` +
            `> 📺 ${r.channel?.name ?? 'Unknown'} • ⏱️ ${r.durationRaw ?? 'Live'}`,
        )
        .join('\n\n');

      // Build number buttons 1–5 + cancel
      const buttons = results.map((_, i) =>
        new ButtonBuilder()
          .setCustomId(`search_${i}`)
          .setLabel(`${i + 1}`)
          .setStyle(ButtonStyle.Primary),
      );
      buttons.push(
        new ButtonBuilder()
          .setCustomId('search_cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger),
      );

      const row = new ActionRowBuilder().addComponents(buttons);

      const msg = await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🔍 Search Results for: ${query}`)
            .setDescription(description)
            .setFooter({ text: `Pick a song below • Expires in 30 seconds` }),
        ],
        components: [row],
      });

      // Collect button press from the same user
      const collector = msg.createMessageComponentCollector({
        filter: btn => btn.user.id === interaction.user.id,
        time: COLLECTOR_TIMEOUT,
        max: 1,
      });

      collector.on('collect', async btn => {
        await btn.deferUpdate().catch(() => {});

        if (btn.customId === 'search_cancel') {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x99AAB5)
                .setDescription('❌ Search cancelled.'),
            ],
            components: [],
          });
          return;
        }

        const index = parseInt(btn.customId.split('_')[1], 10);
        const chosen = results[index];

        if (!chosen) {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Invalid selection.'),
            ],
            components: [],
          });
          return;
        }

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setDescription(`✅ Selected: **[${chosen.title}](${chosen.url})**`),
          ],
          components: [],
        });

        try {
          await interaction.client.distube.play(voiceChannel, chosen.url, {
            member,
            textChannel: interaction.channel,
          });
        } catch (err) {
          console.error('[search] play error:', err);
          await interaction.followUp({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Playback Error')
                .setDescription(`\`${err.message ?? err}\``),
            ],
            flags: 64,
          });
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason === 'time') {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x99AAB5)
                .setDescription('⏱️ Search timed out — no song selected.'),
            ],
            components: [],
          }).catch(() => {});
        }
      });
    } catch (err) {
      console.error('[search] error:', err);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Search Error')
            .setDescription(`\`${err.message ?? err}\``),
        ],
      });
    }
  },
};
