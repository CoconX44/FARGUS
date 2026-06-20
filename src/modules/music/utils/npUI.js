/**
 * Shared Now Playing embed, button rows, and collector.
 * Lazy-requires queueUI to avoid circular dependency.
 */
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const LOOP_MODE_LABELS = { 0: 'Off', 1: 'Song', 2: 'Queue' };
const LOOP_MODE_EMOJIS = { 0: '🔁', 1: '🔂', 2: '🔁' };
const BAR_LENGTH = 20;

/**
 * Builds a progress bar string.
 * @param {number} current  seconds elapsed
 * @param {number} total    total seconds
 * @returns {string}
 */
function buildProgressBar(current, total) {
  if (!total || total <= 0) return '░'.repeat(BAR_LENGTH);
  const pct = Math.min(BAR_LENGTH, Math.round((current / total) * BAR_LENGTH));
  return '█'.repeat(pct) + '░'.repeat(BAR_LENGTH - pct);
}

/**
 * Formats seconds to mm:ss or hh:mm:ss.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Builds the Now Playing embed for a DisTube queue.
 * @param {import('distube').Queue} queue
 * @returns {EmbedBuilder}
 */
function buildNpEmbed(queue) {
  const song = queue.songs[0];
  const elapsed = Math.floor(queue.currentTime ?? 0);
  const total = song.duration ?? 0;
  const bar = buildProgressBar(elapsed, total);

  const loopLabel = LOOP_MODE_LABELS[queue.repeatMode] ?? 'Off';
  const loopEmoji = LOOP_MODE_EMOJIS[queue.repeatMode] ?? '🔁';

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎵 Now Playing')
    .setDescription(
      `**[${song.name}](${song.url})**\n\n` +
      `\`${formatTime(elapsed)}\` ${bar} \`${song.formattedDuration}\``,
    )
    .addFields(
      { name: 'Requested by', value: `${song.user}`, inline: true },
      { name: 'Volume', value: `${queue.volume}%`, inline: true },
      { name: `Loop ${loopEmoji}`, value: loopLabel, inline: true },
      { name: 'Autoplay', value: queue.autoplay ? '✅ On' : '❌ Off', inline: true },
      { name: 'Queue', value: `${queue.songs.length} song(s)`, inline: true },
    )
    .setThumbnail(song.thumbnail)
    .setFooter({ text: `Source: ${song.source ?? 'YouTube'}` });
}

/**
 * Builds the two ActionRows for the Now Playing panel.
 * Row 1: 🔉 ⏸️/▶️ ⏭️ ⏹️ 🔊
 * Row 2: 🔀 loop-toggle 📋 Queue 🔄 Autoplay
 * @param {import('distube').Queue} queue
 * @returns {ActionRowBuilder[]}
 */
function buildNpRows(queue) {
  const paused = queue.paused;
  const loopMode = queue.repeatMode ?? 0;
  const nextLoopLabel = loopMode === 0 ? '🔂 Song' : loopMode === 1 ? '🔁 Queue' : '🔁 Off';

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('np_voldown')
      .setEmoji('🔉')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('np_pause')
      .setEmoji(paused ? '▶️' : '⏸️')
      .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('np_skip')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('np_stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('np_volup')
      .setEmoji('🔊')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('np_shuffle')
      .setEmoji('🔀')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('np_loop')
      .setLabel(nextLoopLabel)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('np_list')
      .setEmoji('📋')
      .setLabel('Queue')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('np_autoplay')
      .setEmoji('🔄')
      .setLabel('Autoplay')
      .setStyle(queue.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  return [row1, row2];
}

/**
 * Attaches an interaction collector to a Now Playing message.
 * @param {import('discord.js').Message} msg
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} client
 * @param {function} editFn  - async (embed, rows) => void — called to update the message
 */
function attachNpCollector(msg, guild, client, editFn) {
  const collector = msg.createMessageComponentCollector({ time: 5 * 60 * 1000 });

  collector.on('collect', async btn => {
    await btn.deferUpdate().catch(() => {});

    const queue = client.distube.getQueue(guild);
    if (!queue) {
      await btn.followUp({
        content: '❌ There is no active queue.',
        flags: 64,
      }).catch(() => {});
      return;
    }

    try {
      switch (btn.customId) {
        case 'np_pause':
          queue.paused ? queue.resume() : queue.pause();
          break;

        case 'np_skip':
          await queue.skip();
          break;

        case 'np_stop':
          await queue.stop();
          return;

        case 'np_voldown': {
          const newVol = Math.max(0, queue.volume - 10);
          queue.setVolume(newVol);
          break;
        }

        case 'np_volup': {
          const newVol = Math.min(150, queue.volume + 10);
          queue.setVolume(newVol);
          break;
        }

        case 'np_shuffle':
          queue.shuffle();
          break;

        case 'np_loop': {
          const next = (queue.repeatMode + 1) % 3;
          queue.setRepeatMode(next);
          break;
        }

        case 'np_autoplay':
          client.distube.toggleAutoplay(guild);
          break;

        case 'np_list': {
          // Lazy require to avoid circular dependency
          const { buildQueueEmbed, buildQueueRows, attachQueueCollector } = require('./queueUI');
          const qEmbed = buildQueueEmbed(queue, 1);
          const qRows = buildQueueRows(queue, 1);
          const qMsg = await btn.followUp({
            embeds: [qEmbed],
            components: qRows,
            flags: 64,
          }).catch(() => null);
          if (qMsg) {
            attachQueueCollector(qMsg, guild, client, async (embed, rows) => {
              await qMsg.edit({ embeds: [embed], components: rows }).catch(() => {});
            });
          }
          return;
        }

        default:
          return;
      }

      // Refresh the NP panel after action
      const updatedQueue = client.distube.getQueue(guild);
      if (updatedQueue) {
        const embed = buildNpEmbed(updatedQueue);
        const rows = buildNpRows(updatedQueue);
        await editFn(embed, rows);
      }
    } catch (err) {
      console.error('[npUI] collector error:', err);
      await btn.followUp({
        content: `❌ Error: \`${err.message ?? err}\``,
        flags: 64,
      }).catch(() => {});
    }
  });

  collector.on('end', async () => {
    // Disable all buttons when collector expires
    try {
      const queue = client.distube.getQueue(guild);
      const embed = queue
        ? buildNpEmbed(queue)
        : new EmbedBuilder().setColor(0x99AAB5).setDescription('🎵 Player panel expired.');
      const rows = queue ? buildNpRows(queue) : [];
      // Disable all buttons
      const disabledRows = rows.map(row => {
        const newRow = ActionRowBuilder.from(row);
        newRow.components.forEach(btn => btn.setDisabled(true));
        return newRow;
      });
      await editFn(embed, disabledRows);
    } catch {
      // Message may have been deleted — ignore
    }
  });
}

module.exports = { buildNpEmbed, buildNpRows, attachNpCollector };
