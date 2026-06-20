const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// lyrics.ovh — free, no API key needed
async function fetchLyrics(query) {
  // Step 1: search to get proper artist + title
  const searchRes = await fetch(
    `https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`
  );
  if (!searchRes.ok) throw new Error('Lyrics service unavailable.');

  const searchData = await searchRes.json();
  if (!searchData.data?.length) throw new Error(`No results found for: **${query}**`);

  const hit = searchData.data[0];
  const artist = hit.artist.name;
  const title = hit.title;

  // Step 2: fetch the actual lyrics
  const lyricsRes = await fetch(
    `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
  );
  const lyricsData = await lyricsRes.json();

  if (lyricsData.error || !lyricsData.lyrics) {
    throw new Error(`Lyrics not available for **${title}** by ${artist}.`);
  }

  return {
    lyrics: lyricsData.lyrics.trim(),
    title,
    artist,
    cover: hit.album?.cover_medium || null,
  };
}

function splitIntoChunks(text, maxLen = 4000) {
  const chunks = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + '\n' + line).length > maxLen) {
      chunks.push(current.trim());
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Get lyrics for the current or a specified song')
    .addStringOption(opt =>
      opt.setName('song')
        .setDescription('Song name to search (leave empty for current song)')
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const queue = client.distube.getQueue(interaction.guild);
    const searchQuery = interaction.options.getString('song') ||
      queue?.songs[0]?.name?.replace(/\(.*?\)|\[.*?\]/g, '').trim();

    if (!searchQuery) {
      return interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription('❌ No song is playing and no search query was provided!')
      ]});
    }

    try {
      const { lyrics, title, artist, cover } = await fetchLyrics(searchQuery);
      const chunks = splitIntoChunks(lyrics);

      const firstEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🎤 ${title}`)
        .setDescription(chunks[0])
        .setFooter({ text: `${artist} • Powered by lyrics.ovh` });

      if (cover) firstEmbed.setThumbnail(cover);

      await interaction.editReply({ embeds: [firstEmbed] });

      for (let i = 1; i < Math.min(chunks.length, 3); i++) {
        await interaction.followUp({ embeds: [
          new EmbedBuilder().setColor(0x5865F2).setDescription(chunks[i])
        ]});
      }

    } catch (err) {
      await interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('❌ Lyrics Not Found')
          .setDescription(err.message)
      ]});
    }
  },
};
