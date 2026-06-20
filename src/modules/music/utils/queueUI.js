const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { awaitModal } = require('./awaitModal');
const { buildNpEmbed, buildNpRows, attachNpCollector } = require('./npUI');

const PER_PAGE = 10;

function buildQueueEmbed(queue, page) {
  const total = Math.ceil(queue.songs.length / PER_PAGE);
  const start = (page - 1) * PER_PAGE;
  const list = queue.songs.slice(start, start + PER_PAGE).map((s, i) => {
    const num = start + i;
    const prefix = num === 0 ? '▶️' : `\`${num}.\``;
    return `${prefix} **${s.name}** \`${s.formattedDuration}\`\n　└ ${s.user}`;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📋 Queue — ${queue.songs.length} song(s)`)
    .setDescription(list || 'Empty')
    .addFields(
      { name: 'Total Duration', value: queue.formattedDuration,                           inline: true },
      { name: 'Volume',         value: `${queue.volume}%`,                                inline: true },
      { name: 'Loop',           value: ['Off','Song','Queue'][queue.repeatMode] ?? 'Off', inline: true },
    )
    .setFooter({ text: `Page ${page} / ${total} • Numbers are for Remove/Move` });
}

function buildQueueRows(queue, page) {
  const total = Math.ceil(queue.songs.length / PER_PAGE);
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('q_prev')  .setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
      new ButtonBuilder().setCustomId('q_next')  .setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= total),
      new ButtonBuilder().setCustomId('q_remove').setLabel('Remove Song').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('q_move')  .setLabel('Move Song')  .setEmoji('↕️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('q_np')    .setLabel('Now Playing').setEmoji('🎵').setStyle(ButtonStyle.Success),
    ),
  ];
}

/**
 * Attaches queue button handling to an already-sent message.
 * @param {Message} msg         - the message containing the queue embed
 * @param {Guild}   guild       - the Discord guild
 * @param {Client}  client      - the Discord client
 * @param {Function} editFn     - (payload) => Promise — edits the message
 * @param {number}  [startPage] - initial page
 */
function attachQueueCollector(msg, guild, client, editFn, startPage = 1) {
  let page = startPage;

  const collector = msg.createMessageComponentCollector({
    filter: i => ['q_prev','q_next','q_remove','q_move','q_np'].includes(i.customId),
    time: 5 * 60 * 1000,
  });

  collector.on('collect', async btn => {
    const q = client.distube.getQueue(guild);
    if (!q?.songs.length) {
      collector.stop();
      return editFn({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ Queue ended.')], components: [] });
    }

    // ── Now Playing ─────────────────────────────────────────────────────
    if (btn.customId === 'q_np') {
      await btn.deferUpdate();
      const npMsg = await btn.followUp({
        embeds: [buildNpEmbed(q)],
        components: buildNpRows(q),
        fetchReply: true,
      });
      attachNpCollector(npMsg, guild, client, payload => npMsg.edit(payload));
      return;
    }

    // ── Remove Song ──────────────────────────────────────────────────────
    if (btn.customId === 'q_remove') {
      await btn.showModal(
        new ModalBuilder()
          .setCustomId('modal_remove')
          .setTitle('🗑️ Remove a Song')
          .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('position')
              .setLabel(`Song number to remove (1 – ${q.songs.length - 1})`)
              .setStyle(TextInputStyle.Short).setPlaceholder('e.g. 2').setRequired(true)
          ))
      );
      const submit = await awaitModal(btn.client, 'modal_remove', btn.user.id);
      if (!submit) return;

      const pos = parseInt(submit.fields.getTextInputValue('position'));
      const fresh = client.distube.getQueue(guild);
      if (!fresh || isNaN(pos) || pos < 1 || pos >= fresh.songs.length) {
        return submit.reply({ content: `❌ Invalid number. Pick 1–${(fresh?.songs.length ?? 2) - 1}.`, flags: 64 });
      }
      const removed = fresh.songs.splice(pos, 1)[0];
      page = Math.min(page, Math.ceil(fresh.songs.length / PER_PAGE) || 1);
      const payload = { embeds: [buildQueueEmbed(fresh, page)], components: buildQueueRows(fresh, page) };
      if (submit.isFromMessage()) await submit.update(payload);
      else { await submit.reply({ content: `🗑️ Removed **${removed.name}**`, flags: 64 }); await editFn(payload); }
      return;
    }

    // ── Move Song ────────────────────────────────────────────────────────
    if (btn.customId === 'q_move') {
      await btn.showModal(
        new ModalBuilder()
          .setCustomId('modal_move')
          .setTitle('↕️ Move a Song')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('from').setLabel(`Song number to move (1 – ${q.songs.length - 1})`).setStyle(TextInputStyle.Short).setPlaceholder('e.g. 3').setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('to').setLabel(`Move to position (1 – ${q.songs.length - 1})`).setStyle(TextInputStyle.Short).setPlaceholder('e.g. 1').setRequired(true)
            )
          )
      );
      const submit = await awaitModal(btn.client, 'modal_move', btn.user.id);
      if (!submit) return;

      const from  = parseInt(submit.fields.getTextInputValue('from'));
      const to    = parseInt(submit.fields.getTextInputValue('to'));
      const fresh = client.distube.getQueue(guild);
      const max   = (fresh?.songs.length ?? 2) - 1;
      if (!fresh || isNaN(from) || isNaN(to) || from < 1 || from > max || to < 1 || to > max || from === to) {
        return submit.reply({ content: `❌ Both numbers must be between 1–${max} and different.`, flags: 64 });
      }
      const [song] = fresh.songs.splice(from, 1);
      fresh.songs.splice(to, 0, song);
      const payload = { embeds: [buildQueueEmbed(fresh, page)], components: buildQueueRows(fresh, page) };
      if (submit.isFromMessage()) await submit.update(payload);
      else { await submit.reply({ content: `↕️ Moved **${song.name}** to #${to}`, flags: 64 }); await editFn(payload); }
      return;
    }

    // ── Pagination ───────────────────────────────────────────────────────
    await btn.deferUpdate();
    const totalPages = Math.ceil(q.songs.length / PER_PAGE);
    if (btn.customId === 'q_prev') page = Math.max(1, page - 1);
    if (btn.customId === 'q_next') page = Math.min(totalPages, page + 1);
    await editFn({ embeds: [buildQueueEmbed(q, page)], components: buildQueueRows(q, page) });
  });

  collector.on('end', () => editFn({ components: [] }).catch(() => {}));
}

module.exports = { PER_PAGE, buildQueueEmbed, buildQueueRows, attachQueueCollector };
