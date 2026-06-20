/**
 * Shared Queue embed, button rows, and collector.
 * Lazy-requires npUI to avoid circular dependency.
 */
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { awaitModal } = require('./awaitModal');

const PAGE_SIZE = 10;

/**
 * Builds a queue page embed.
 * @param {import('distube').Queue} queue
 * @param {number} page  - 1-based page number
 * @returns {EmbedBuilder}
 */
function buildQueueEmbed(queue, page = 1) {
  const songs = queue.songs;
  const totalPages = Math.max(1, Math.ceil((songs.length - 1) / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  // songs[0] is now playing; songs[1..] are queued
  const nowPlaying = songs[0];
  const queued = songs.slice(1);

  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageItems = queued.slice(startIdx, startIdx + PAGE_SIZE);

  const description =
    `**Now Playing:**\n▶️ **[${nowPlaying.name}](${nowPlaying.url})** — \`${nowPlaying.formattedDuration}\` — ${nowPlaying.user}\n\n` +
    (queued.length === 0
      ? '*No songs in queue.*'
      : pageItems
          .map((s, i) => `\`${startIdx + i + 1}.\` **[${s.name}](${s.url})** — \`${s.formattedDuration}\` — ${s.user}`)
          .join('\n'));

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📋 Music Queue')
    .setDescription(description)
    .addFields(
      { name: 'Total Songs', value: `${songs.length}`, inline: true },
      { name: 'Loop', value: ['Off', 'Song', 'Queue'][queue.repeatMode] ?? 'Off', inline: true },
      { name: 'Autoplay', value: queue.autoplay ? '✅ On' : '❌ Off', inline: true },
    )
    .setFooter({ text: `Page ${safePage}/${totalPages} • Volume: ${queue.volume}%` });
}

/**
 * Builds the ActionRow with pagination and action buttons.
 * Buttons: ◀️ ▶️ Remove🗑️ Move↕️ NowPlaying🎵
 * @param {import('distube').Queue} queue
 * @param {number} page  - 1-based page number
 * @returns {ActionRowBuilder[]}
 */
function buildQueueRows(queue, page = 1) {
  const songs = queue.songs;
  const totalPages = Math.max(1, Math.ceil((songs.length - 1) / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('q_prev')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage <= 1),
    new ButtonBuilder()
      .setCustomId('q_next')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage >= totalPages),
    new ButtonBuilder()
      .setCustomId('q_remove')
      .setEmoji('🗑️')
      .setLabel('Remove')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('q_move')
      .setEmoji('↕️')
      .setLabel('Move')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('q_np')
      .setEmoji('🎵')
      .setLabel('Now Playing')
      .setStyle(ButtonStyle.Success),
  );

  return [row];
}

/**
 * Attaches a component collector to a queue message.
 * Handles pagination, remove/move via modals, and NP panel.
 *
 * @param {import('discord.js').Message} msg
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} client
 * @param {function} editFn    - async (embed, rows) => void
 * @param {number} startPage   - initial page (1-based)
 */
function attachQueueCollector(msg, guild, client, editFn, startPage = 1) {
  let currentPage = startPage;

  const collector = msg.createMessageComponentCollector({ time: 5 * 60 * 1000 });

  collector.on('collect', async btn => {
    const queue = client.distube.getQueue(guild);
    if (!queue) {
      await btn.reply({
        content: '❌ There is no active queue.',
        flags: 64,
      }).catch(() => {});
      return;
    }

    const totalPages = Math.max(1, Math.ceil((queue.songs.length - 1) / PAGE_SIZE));

    try {
      switch (btn.customId) {
        case 'q_prev':
          await btn.deferUpdate().catch(() => {});
          currentPage = Math.max(1, currentPage - 1);
          await editFn(buildQueueEmbed(queue, currentPage), buildQueueRows(queue, currentPage));
          break;

        case 'q_next':
          await btn.deferUpdate().catch(() => {});
          currentPage = Math.min(totalPages, currentPage + 1);
          await editFn(buildQueueEmbed(queue, currentPage), buildQueueRows(queue, currentPage));
          break;

        case 'q_remove': {
          // Show modal to get position
          const modal = new ModalBuilder()
            .setCustomId(`q_remove_modal_${btn.user.id}`)
            .setTitle('Remove Song from Queue')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('remove_position')
                  .setLabel('Song position (1 = first in queue)')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('e.g. 2')
                  .setRequired(true),
              ),
            );

          await btn.showModal(modal);

          const submission = await awaitModal(
            client,
            `q_remove_modal_${btn.user.id}`,
            btn.user.id,
          );

          if (!submission) {
            // Timed out — nothing to do
            break;
          }

          await submission.deferUpdate().catch(() => {});

          const rawPos = submission.fields.getTextInputValue('remove_position');
          const pos = parseInt(rawPos, 10);

          if (isNaN(pos) || pos < 1 || pos >= queue.songs.length) {
            await submission.followUp({
              content: `❌ Invalid position. Enter a number between 1 and ${queue.songs.length - 1}.`,
              flags: 64,
            }).catch(() => {});
            break;
          }

          const removed = queue.songs[pos];
          queue.songs.splice(pos, 1);

          await submission.followUp({
            content: `🗑️ Removed **${removed.name}** from the queue.`,
            flags: 64,
          }).catch(() => {});

          // Clamp page after removal
          const newTotal = Math.max(1, Math.ceil((queue.songs.length - 1) / PAGE_SIZE));
          currentPage = Math.min(currentPage, newTotal);
          await editFn(buildQueueEmbed(queue, currentPage), buildQueueRows(queue, currentPage));
          break;
        }

        case 'q_move': {
          const modal = new ModalBuilder()
            .setCustomId(`q_move_modal_${btn.user.id}`)
            .setTitle('Move Song in Queue')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('move_from')
                  .setLabel('Move FROM position')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('e.g. 3')
                  .setRequired(true),
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('move_to')
                  .setLabel('Move TO position')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('e.g. 1')
                  .setRequired(true),
              ),
            );

          await btn.showModal(modal);

          const submission = await awaitModal(
            client,
            `q_move_modal_${btn.user.id}`,
            btn.user.id,
          );

          if (!submission) break;

          await submission.deferUpdate().catch(() => {});

          const fromRaw = submission.fields.getTextInputValue('move_from');
          const toRaw = submission.fields.getTextInputValue('move_to');
          const from = parseInt(fromRaw, 10);
          const to = parseInt(toRaw, 10);
          const maxPos = queue.songs.length - 1;

          if (
            isNaN(from) || from < 1 || from > maxPos ||
            isNaN(to) || to < 1 || to > maxPos
          ) {
            await submission.followUp({
              content: `❌ Invalid position(s). Enter numbers between 1 and ${maxPos}.`,
              flags: 64,
            }).catch(() => {});
            break;
          }

          // songs[0] = now playing, so queue positions start at index 1
          const [song] = queue.songs.splice(from, 1);
          queue.songs.splice(to, 0, song);

          await submission.followUp({
            content: `↕️ Moved **${song.name}** from position ${from} to ${to}.`,
            flags: 64,
          }).catch(() => {});

          await editFn(buildQueueEmbed(queue, currentPage), buildQueueRows(queue, currentPage));
          break;
        }

        case 'q_np': {
          await btn.deferUpdate().catch(() => {});
          // Lazy require to avoid circular dependency
          const { buildNpEmbed, buildNpRows, attachNpCollector } = require('./npUI');
          const npEmbed = buildNpEmbed(queue);
          const npRows = buildNpRows(queue);
          const npMsg = await btn.followUp({
            embeds: [npEmbed],
            components: npRows,
            flags: 64,
          }).catch(() => null);
          if (npMsg) {
            attachNpCollector(npMsg, guild, client, async (embed, rows) => {
              await npMsg.edit({ embeds: [embed], components: rows }).catch(() => {});
            });
          }
          return;
        }

        default:
          await btn.deferUpdate().catch(() => {});
          break;
      }
    } catch (err) {
      console.error('[queueUI] collector error:', err);
      // Try to reply if not already deferred
      try {
        await btn.followUp({
          content: `❌ Error: \`${err.message ?? err}\``,
          flags: 64,
        });
      } catch {
        // Already replied or timed out
      }
    }
  });

  collector.on('end', async () => {
    try {
      const queue = client.distube.getQueue(guild);
      const embed = queue
        ? buildQueueEmbed(queue, currentPage)
        : new EmbedBuilder().setColor(0x99AAB5).setDescription('📋 Queue panel expired.');
      const rows = queue ? buildQueueRows(queue, currentPage) : [];
      const disabledRows = rows.map(row => {
        const newRow = ActionRowBuilder.from(row);
        newRow.components.forEach(btn => btn.setDisabled(true));
        return newRow;
      });
      await editFn(embed, disabledRows);
    } catch {
      // Ignore — message may have been deleted
    }
  });
}

module.exports = { buildQueueEmbed, buildQueueRows, attachQueueCollector };
