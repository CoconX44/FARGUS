const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const play = require('play-dl');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for a song and pick from the top 5 results')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Song name or artist')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const query = interaction.options.getString('query');
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription('❌ You must be in a voice channel first!')
      ]});
    }

    // Search YouTube for top 5 results
    let results;
    try {
      results = await play.search(query, { source: { youtube: 'video' }, limit: 5 });
    } catch {
      return interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription('❌ Search failed. Try again or use `/play` with a direct link.')
      ]});
    }

    if (!results.length) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription(`❌ No results found for: **${query}**`)
      ]});
    }

    // Build results embed
    const description = results.map((v, i) =>
      `**${i + 1}.** [${v.title}](${v.url})\n` +
      `    ⏱️ \`${v.durationRaw}\` • 👤 ${v.channel?.name ?? 'Unknown'}`
    ).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🔍 Search results for: ${query}`)
      .setDescription(description)
      .setFooter({ text: 'Pick a song below • expires in 30s' });

    // Build number buttons 1–5
    const row = new ActionRowBuilder().addComponents(
      results.map((_, i) =>
        new ButtonBuilder()
          .setCustomId(`search_${i}`)
          .setLabel(`${i + 1}`)
          .setStyle(ButtonStyle.Primary)
      )
    );

    const cancelBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('search_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.editReply({
      embeds: [embed],
      components: [row, cancelBtn],
    });

    // Wait for the user to click
    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 30_000,
      max: 1,
    });

    collector.on('collect', async btnInteraction => {
      await btnInteraction.deferUpdate();

      if (btnInteraction.customId === 'search_cancel') {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription('🚫 Search cancelled.')],
          components: [],
        });
      }

      const index = parseInt(btnInteraction.customId.replace('search_', ''));
      const chosen = results[index];

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(`✅ Adding **[${chosen.title}](${chosen.url})** to queue...`)
        ],
        components: [],
      });

      try {
        await client.distube.play(voiceChannel, chosen.url, {
          member: interaction.member,
          textChannel: interaction.channel,
        });
      } catch (err) {
        await interaction.editReply({ embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ Could not play this song: \`${err.message}\``)
        ], components: [] });
      }
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0x99AAB5).setDescription('⏱️ Search expired — no song selected.')],
          components: [],
        }).catch(() => {});
      }
    });
  },
};
