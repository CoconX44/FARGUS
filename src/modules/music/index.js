const { DisTube } = require('distube');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { EmbedBuilder } = require('discord.js');
function setupMusic(client) {
  client.distube = new DisTube(client, {
    ffmpeg: { path: require('ffmpeg-static') },
    plugins: [
      new SoundCloudPlugin(),
      new YtDlpPlugin({ update: false }),
    ],
    emitNewSongOnly: true,
    joinNewVoiceChannel: true,
    leaveOnFinish: false,
    leaveOnEmpty: false,
  });

  registerDisTubeEvents(client.distube);
  console.log('🎵 Music module loaded.');
}

function registerDisTubeEvents(distube) {
  distube.on('playSong', (queue, song) => {
    queue.textChannel?.send({ embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('▶️ Now Playing')
        .setDescription(`**[${song.name}](${song.url})**`)
        .addFields(
          { name: 'Duration', value: song.formattedDuration, inline: true },
          { name: 'Requested by', value: `${song.user}`, inline: true },
          { name: 'Volume', value: `${queue.volume}%`, inline: true },
        )
        .setThumbnail(song.thumbnail)
        .setFooter({ text: `Queue: ${queue.songs.length} song(s)` })
    ]});
  });

  distube.on('addSong', (queue, song) => {
    queue.textChannel?.send({ embeds: [
      new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('➕ Added to Queue')
        .setDescription(`**[${song.name}](${song.url})**`)
        .addFields(
          { name: 'Duration', value: song.formattedDuration, inline: true },
          { name: 'Position', value: `#${queue.songs.length}`, inline: true },
        )
        .setThumbnail(song.thumbnail)
    ]});
  });

  distube.on('addList', (queue, playlist) => {
    queue.textChannel?.send({ embeds: [
      new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('➕ Playlist Added')
        .setDescription(`**${playlist.name}** — ${playlist.songs.length} songs`)
        .addFields({ name: 'Total Duration', value: playlist.formattedDuration, inline: true })
    ]});
  });

  distube.on('finish', (queue) => {
    queue.textChannel?.send({ embeds: [
      new EmbedBuilder()
        .setColor(0xFEE75C)
        .setDescription('✅ Queue finished. Use `!play` or `/play` to add more songs!')
    ]});
  });

  distube.on('disconnect', (queue) => {
    queue.textChannel?.send({ embeds: [
      new EmbedBuilder()
        .setColor(0xFEE75C)
        .setDescription('👋 Disconnected from voice channel.')
    ]});
  });

  distube.on('error', (error, queue) => {
    console.error('DisTube error:', error.message ?? error);
    queue?.textChannel?.send({ embeds: [
      new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('❌ Music Error')
        .setDescription(`\`${error.message ?? error}\``)
    ]});
  });
}

module.exports = { setupMusic };
