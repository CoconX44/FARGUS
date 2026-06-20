const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isSpotifyUrl, resolveSpotify } = require('../utils/spotifyResolver');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist from YouTube, SoundCloud, or Spotify.')
    .addStringOption(opt =>
      opt
        .setName('query')
        .setDescription('Song name, YouTube URL, SoundCloud URL, or Spotify URL')
        .setRequired(true),
    ),

  async execute(interaction) {
    const query = interaction.options.getString('query', true);
    const member = interaction.member;
    const voiceChannel = member.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ You must be in a voice channel to play music!',
        flags: 64,
      });
    }

    await interaction.deferReply();

    const distube = interaction.client.distube;

    try {
      // Spotify interception
      if (isSpotifyUrl(query)) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x1DB954)
              .setDescription('🎵 Resolving Spotify link, please wait...'),
          ],
        });

        const { type, name, queries } = await resolveSpotify(query);

        if (queries.length === 0) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ No tracks found for this Spotify link.'),
            ],
          });
        }

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x1DB954)
              .setDescription(
                `✅ Queuing **${queries.length}** track(s) from Spotify ${type}: **${name}**`,
              ),
          ],
        });

        // Queue each resolved query sequentially
        for (const q of queries) {
          await distube.play(voiceChannel, q, {
            member,
            textChannel: interaction.channel,
          }).catch(err => console.error(`[play] Spotify track error for "${q}":`, err));
        }
        return;
      }

      // Normal YouTube / SoundCloud / search
      await distube.play(voiceChannel, query, {
        member,
        textChannel: interaction.channel,
      });

      // The addSong / playSong events will handle the response embed.
      // Edit the deferred reply to a minimal confirmation.
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(`🔍 Processing: **${query}**`),
        ],
      });
    } catch (err) {
      console.error('[play] error:', err);
      const msg = err.message ?? String(err);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Playback Error')
            .setDescription(`\`${msg}\``),
        ],
      });
    }
  },
};
