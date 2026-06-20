const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isSpotifyUrl, resolveSpotify } = require('../utils/spotifyResolver');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist from YouTube, Spotify, SoundCloud, or any URL')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Song name, URL, or playlist link')
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
          .setDescription('❌ You must be in a voice channel to play music!')
      ]});
    }

    const perms = voiceChannel.permissionsFor(interaction.guild.members.me);
    if (!perms.has('Connect') || !perms.has('Speak')) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription('❌ I need **Connect** and **Speak** permissions in your voice channel!')
      ]});
    }

    const disTubeOptions = {
      member: interaction.member,
      textChannel: interaction.channel,
    };

    // ── Spotify bypass — no API credentials needed ─────────────────────────
    if (isSpotifyUrl(query)) {
      return handleSpotify(interaction, client, voiceChannel, query, disTubeOptions);
    }

    // ── YouTube / SoundCloud / direct URL / plain search ──────────────────
    try {
      await client.distube.play(voiceChannel, query, disTubeOptions);
      await interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setDescription(`🔍 Searching: **${query}**`)
      ]});
    } catch (err) {
      await interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('❌ Error')
          .setDescription(`\`${err.message}\``)
      ]});
    }
  },
};

async function handleSpotify(interaction, client, voiceChannel, url, options) {
  try {
    await interaction.editReply({ embeds: [
      new EmbedBuilder()
        .setColor(0x1DB954)
        .setDescription('🎵 Resolving Spotify link...')
    ]});

    const resolved = await resolveSpotify(url);

    if (resolved.type === 'track') {
      await client.distube.play(voiceChannel, resolved.queries[0], options);
      await interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setColor(0x1DB954)
          .setDescription(`🎵 Playing Spotify track: **${resolved.name}**`)
      ]});
      return;
    }

    // Playlist / album — queue tracks, suppress per-song spam on the rest
    const capped = resolved.total > resolved.queries.length;
    await interaction.editReply({ embeds: [
      new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle(`🎵 Queueing Spotify ${resolved.type}`)
        .setDescription(`**${resolved.name}**`)
        .addFields({
          name: 'Tracks',
          value: `${resolved.queries.length}${capped ? ` / ${resolved.total} (capped at 100)` : ''}`,
          inline: true,
        })
        .setFooter({ text: 'Adding songs to queue in background...' })
    ]});

    const silentOptions = { ...options, textChannel: null };
    await client.distube.play(voiceChannel, resolved.queries[0], options);

    for (let i = 1; i < resolved.queries.length; i++) {
      try {
        await client.distube.play(voiceChannel, resolved.queries[i], silentOptions);
      } catch {
        // skip unresolvable tracks silently
      }
    }

  } catch (err) {
    await interaction.editReply({ embeds: [
      new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('❌ Spotify Error')
        .setDescription(`\`${err.message}\``)
    ]});
  }
}
