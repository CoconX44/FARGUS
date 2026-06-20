const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const LYRICS_OVH_SEARCH = 'https://api.lyrics.ovh/suggest/';
const LYRICS_OVH_GET = 'https://api.lyrics.ovh/v1/';

/**
 * Splits a long lyrics string into chunks of at most maxLen characters,
 * breaking on newlines where possible.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string[]}
 */
function splitLyrics(text, maxLen = 4000) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt <= 0) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Fetch lyrics for a song.')
    .addStringOption(opt =>
      opt
        .setName('song')
        .setDescription('Song name (and optionally artist), e.g. "Shape of You" or "Ed Sheeran Shape of You"')
        .setRequired(true),
    ),

  async execute(interaction) {
    const query = interaction.options.getString('song', true);
    await interaction.deferReply();

    try {
      // Step 1: Search for the song on lyrics.ovh
      const searchUrl = LYRICS_OVH_SEARCH + encodeURIComponent(query);
      const searchRes = await fetch(searchUrl);

      if (!searchRes.ok) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('❌ Could not reach the lyrics service. Try again later.'),
          ],
        });
      }

      const searchData = await searchRes.json();
      const results = searchData?.data;

      if (!results || results.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setDescription(`❌ No results found for **${query}**.`),
          ],
        });
      }

      const match = results[0];
      const artist = match.artist?.name ?? 'Unknown Artist';
      const title = match.title ?? 'Unknown Title';

      // Step 2: Fetch actual lyrics
      const lyricsUrl = `${LYRICS_OVH_GET}${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      const lyricsRes = await fetch(lyricsUrl);

      if (!lyricsRes.ok) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription(`❌ Could not fetch lyrics for **${title}** by **${artist}**.`),
          ],
        });
      }

      const lyricsData = await lyricsRes.json();

      if (!lyricsData.lyrics) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setDescription(
                `❌ Lyrics not available for **${title}** by **${artist}**.`,
              ),
          ],
        });
      }

      const lyricsText = lyricsData.lyrics.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
      const chunks = splitLyrics(lyricsText);

      // Send first chunk as the deferred reply
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🎵 ${title}`)
            .setDescription(chunks[0])
            .setFooter({ text: `Artist: ${artist} • Powered by lyrics.ovh` }),
        ],
      });

      // Send overflow chunks as follow-ups
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865F2)
              .setDescription(chunks[i])
              .setFooter({ text: `${title} (continued ${i + 1}/${chunks.length})` }),
          ],
        });
      }
    } catch (err) {
      console.error('[lyrics] error:', err);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Lyrics Error')
            .setDescription(`\`${err.message ?? err}\``),
        ],
      });
    }
  },
};
