const { DisTube } = require('distube');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

function setupMusic(client) {
  const { execSync } = require('child_process');
  const ytdlpBin = path.join(process.cwd(), 'node_modules/yt-dlp-wrap/bin/yt-dlp');
  console.log('[yt-dlp] binary exists:', fs.existsSync(ytdlpBin), '|', ytdlpBin);
  try {
    const ver = execSync(`"${ytdlpBin}" --version 2>&1`, { timeout: 10000 }).toString().trim();
    console.log('[yt-dlp] execution OK, version:', ver);
  } catch (e) {
    console.error('[yt-dlp] EXECUTION FAILED:', e.message);
  }

  const ffmpegPath = require('ffmpeg-static');
  console.log('[ffmpeg] path:', ffmpegPath, '| exists:', fs.existsSync(ffmpegPath));

  try {
    const sodium = require('libsodium-wrappers');
    sodium.ready.then(() => console.log('[sodium] libsodium-wrappers ready'));
  } catch (e) {
    console.error('[sodium] MISSING libsodium-wrappers:', e.message);
  }

  client.distube = new DisTube(client, {
    ffmpeg: { path: ffmpegPath },
    plugins: [
      new SoundCloudPlugin(),
      new YtDlpPlugin({ update: false }),
    ],
    emitNewSongOnly: true,
    joinNewVoiceChannel: true,
  });
  registerDisTubeEvents(client.distube);
  console.log('[music] module loaded');
}

function registerDisTubeEvents(distube) {
  distube.on('initQueue', queue => {
    queue.autoplay = false;
    console.log('[DisTube] initQueue — guild:', queue.id);
  });

  distube.on('playSong', (queue, song) => {
    console.log(`[DisTube] playSong — "${song.name}" | ${song.formattedDuration} | ${song.url}`);
    queue.textChannel?.send({
      embeds: [
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
          .setFooter({ text: `Queue: ${queue.songs.length} song(s)` }),
      ],
    });
  });

  distube.on('addSong', (queue, song) => {
    queue.textChannel?.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('➕ Added to Queue')
          .setDescription(`**[${song.name}](${song.url})**`)
          .addFields(
            { name: 'Duration', value: song.formattedDuration, inline: true },
            { name: 'Position', value: `#${queue.songs.length}`, inline: true },
          )
          .setThumbnail(song.thumbnail),
      ],
    });
  });

  distube.on('addList', (queue, playlist) => {
    queue.textChannel?.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('➕ Playlist Added')
          .setDescription(`**${playlist.name}** — ${playlist.songs.length} songs`)
          .addFields({ name: 'Total Duration', value: playlist.formattedDuration, inline: true }),
      ],
    });
  });

  distube.on('finish', queue => {
    console.log('[DisTube] finish — guild:', queue.id);
    queue.textChannel?.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFEE75C)
          .setDescription('✅ Queue finished. Use `/play` to add more songs!'),
      ],
    });
  });

  distube.on('disconnect', queue => {
    queue.textChannel?.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFEE75C)
          .setDescription('👋 Disconnected from voice channel.'),
      ],
    });
  });

  distube.on('error', (error, queue, song) => {
    console.error('[DisTube ERROR]', error?.message ?? error, '| song:', song?.name ?? 'none');
    queue?.textChannel?.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('❌ Music Error')
          .setDescription(`\`${String(error?.message ?? error).slice(0, 1000)}\``)
          .setFooter({ text: song ? `Song: ${song.name}` : 'No song context' }),
      ],
    });
  });
}

module.exports = { setupMusic };
