const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');

function buildNpEmbed(queue) {
  const song = queue.songs[0];
  const pct  = song.duration > 0 ? Math.min(20, Math.round((queue.currentTime / song.duration) * 20)) : 0;
  const bar  = '█'.repeat(pct) + '░'.repeat(20 - pct);
  const loopLabel = ['Off', 'Song', 'Queue'][queue.repeatMode] ?? 'Off';

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎵 Now Playing')
    .setDescription(`**[${song.name}](${song.url})**`)
    .addFields(
      { name: '⏱️ Progress', value: `\`${queue.formattedCurrentTime}\` ${bar} \`${song.formattedDuration}\``, inline: false },
      { name: '👤 Requested by', value: `${song.user}`,                              inline: true },
      { name: '🔊 Volume',       value: `${queue.volume}%`,                          inline: true },
      { name: '🔁 Loop',         value: loopLabel,                                   inline: true },
      { name: '📋 Queue',        value: `${queue.songs.length} song(s)`,             inline: true },
      { name: '⏸️ Status',       value: queue.paused ? 'Paused ⏸️' : 'Playing ▶️',  inline: true },
    )
    .setThumbnail(song.thumbnail)
    .setFooter({ text: song.uploader?.name || 'Unknown uploader' });
}

function buildNpRows(queue) {
  const isPaused = queue.paused;
  const loopMode = queue.repeatMode;
  const loopStyles = [ButtonStyle.Secondary, ButtonStyle.Success, ButtonStyle.Success];
  const loopEmojis = ['🔁', '🔂', '🔁'];

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('np_voldown').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('np_pause')  .setEmoji(isPaused ? '▶️' : '⏸️').setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('np_skip')   .setEmoji('⏭️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('np_stop')   .setEmoji('⏹️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('np_volup')  .setEmoji('🔊').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('np_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('np_loop')   .setEmoji(loopEmojis[loopMode]).setLabel(loopMode === 0 ? 'Loop Off' : loopMode === 1 ? 'Loop Song' : 'Loop Queue').setStyle(loopStyles[loopMode]),
    new ButtonBuilder().setCustomId('np_list')   .setLabel('Queue').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('np_refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

/**
 * Attaches NP button handling to a message.
 * @param {Message}  msg    - the message with NP embed
 * @param {Guild}    guild
 * @param {Client}   client
 * @param {Function} editFn - (payload) => Promise — how to update this message
 */
function attachNpCollector(msg, guild, client, editFn) {
  const { buildQueueEmbed, buildQueueRows, attachQueueCollector } = require('./queueUI');

  const collector = msg.createMessageComponentCollector({ time: 5 * 60 * 1000 });

  collector.on('collect', async btn => {
    await btn.deferUpdate();

    const q = client.distube.getQueue(guild);
    if (!q) {
      collector.stop();
      return editFn({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('⏹️ Queue ended.')],
        components: [],
      });
    }

    if (!btn.member.voice.channel) {
      return btn.followUp({ content: '❌ Join a voice channel to use controls.', flags: 64 });
    }

    try {
      switch (btn.customId) {
        case 'np_pause':
          q.paused ? await client.distube.resume(guild) : await client.distube.pause(guild);
          break;

        case 'np_skip':
          if (q.songs.length <= 1) {
            await client.distube.stop(guild);
            collector.stop();
            return editFn({
              embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription('⏭️ Skipped — queue is now empty.')],
              components: [],
            });
          }
          await client.distube.skip(guild);
          break;

        case 'np_stop':
          await client.distube.stop(guild);
          collector.stop();
          return editFn({
            embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('⏹️ Stopped and cleared the queue.')],
            components: [],
          });

        case 'np_volup': {
          const newVol = Math.min(q.volume + 10, 150);
          await client.distube.setVolume(guild, newVol);
          break;
        }

        case 'np_voldown': {
          const newVol = Math.max(q.volume - 10, 10);
          await client.distube.setVolume(guild, newVol);
          break;
        }

        case 'np_loop': {
          const next = (q.repeatMode + 1) % 3;
          await client.distube.setRepeatMode(guild, next);
          break;
        }

        case 'np_shuffle':
          if (q.songs.length > 1) await client.distube.shuffle(guild);
          break;

        case 'np_list': {
          const qMsg = await btn.followUp({
            embeds: [buildQueueEmbed(q, 1)],
            components: buildQueueRows(q, 1),
            fetchReply: true,
          });
          attachQueueCollector(qMsg, guild, client, payload => qMsg.edit(payload));
          return;
        }

        case 'np_refresh':
          break;
      }
    } catch (err) {
      return btn.followUp({ content: `❌ ${err.message}`, flags: 64 });
    }

    const updated = client.distube.getQueue(guild);
    if (!updated?.songs.length) {
      collector.stop();
      return editFn({
        embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription('⏹️ Queue ended.')],
        components: [],
      });
    }

    await editFn({ embeds: [buildNpEmbed(updated)], components: buildNpRows(updated) });
  });

  collector.on('end', () => editFn({ components: [] }).catch(() => {}));
}

module.exports = { buildNpEmbed, buildNpRows, attachNpCollector };
