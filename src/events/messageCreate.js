const { EmbedBuilder } = require('discord.js');
const { isSpotifyUrl, resolveSpotify } = require('../modules/music/utils/spotifyResolver');
const { awaitModal } = require('../modules/music/utils/awaitModal');
const { buildQueueEmbed, buildQueueRows, attachQueueCollector } = require('../modules/music/utils/queueUI');
const { buildNpEmbed, buildNpRows, attachNpCollector } = require('../modules/music/utils/npUI');
const { saveData } = require('../modules/sticky');

const PREFIX = '!';

// helper — sends a quick embed reply (Discord description limit: 4096)
function reply(message, color, text) {
  const safe = String(text).slice(0, 4000);
  return message.reply({
    embeds: [new EmbedBuilder().setColor(color).setDescription(safe)],
  });
}

const COMMANDS = {

  // ── play / p ─────────────────────────────────────────────────────────────
  async play(message, args, client) {
    if (!args.length) return reply(message, 0xED4245, '❌ Usage: `!play <song name or URL>`');
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return reply(message, 0xED4245, '❌ Join a voice channel first!');

    const query = args.join(' ');

    if (isSpotifyUrl(query)) {
      reply(message, 0x1DB954, '🎵 Resolving Spotify link...');
      try {
        const resolved = await resolveSpotify(query);
        const silentOpts = { member: message.member, textChannel: null };
        await client.distube.play(voiceChannel, resolved.queries[0], { member: message.member, textChannel: message.channel });
        for (let i = 1; i < resolved.queries.length; i++) {
          await client.distube.play(voiceChannel, resolved.queries[i], silentOpts).catch(() => {});
        }
        if (resolved.type !== 'track') {
          reply(message, 0x1DB954, `✅ Queued **${resolved.queries.length}** tracks from Spotify ${resolved.type}: **${resolved.name}**`);
        }
      } catch (err) {
        reply(message, 0xED4245, `❌ Spotify error: ${err.message}`);
      }
      return;
    }

    try {
      await client.distube.play(voiceChannel, query, {
        member: message.member,
        textChannel: message.channel,
      });
    } catch (err) {
      const msg = String(err.message ?? err).slice(0, 800);
      reply(message, 0xED4245, `❌ ${msg}`);
    }
  },

  // ── skip / s ─────────────────────────────────────────────────────────────
  async skip(message, args, client) {
    const queue = client.distube.getQueue(message.guild);
    if (!queue) return reply(message, 0xED4245, '❌ Nothing is playing!');
    if (!message.member.voice.channel) return reply(message, 0xED4245, '❌ Join a voice channel!');
    const skipped = queue.songs[0];
    try {
      await client.distube.skip(message.guild);
      reply(message, 0xFEE75C, `⏭️ Skipped **${skipped.name}**`);
    } catch (err) {
      reply(message, 0xED4245, `❌ ${err.message}`);
    }
  },

  // ── stop ─────────────────────────────────────────────────────────────────
  async stop(message, args, client) {
    const queue = client.distube.getQueue(message.guild);
    if (!queue) return reply(message, 0xED4245, '❌ Nothing is playing!');
    if (!message.member.voice.channel) return reply(message, 0xED4245, '❌ Join a voice channel!');
    await client.distube.stop(message.guild);
    reply(message, 0xED4245, '⏹️ Stopped and cleared the queue.');
  },

  // ── pause ────────────────────────────────────────────────────────────────
  async pause(message, args, client) {
    const queue = client.distube.getQueue(message.guild);
    if (!queue) return reply(message, 0xED4245, '❌ Nothing is playing!');
    if (!message.member.voice.channel) return reply(message, 0xED4245, '❌ Join a voice channel!');
    if (queue.paused) {
      await client.distube.resume(message.guild);
      reply(message, 0x57F287, '▶️ Resumed.');
    } else {
      await client.distube.pause(message.guild);
      reply(message, 0xFEE75C, '⏸️ Paused.');
    }
  },

  // ── queue / q ────────────────────────────────────────────────────────────
  async queue(message, args, client) {
    const queue = client.distube.getQueue(message.guild);
    if (!queue?.songs.length) return reply(message, 0xED4245, '❌ The queue is empty!');

    const msg = await message.reply({
      embeds: [buildQueueEmbed(queue, 1)],
      components: buildQueueRows(queue, 1),
    });

    attachQueueCollector(msg, message.guild, client, payload => msg.edit(payload));
  },

  // ── np / nowplaying ──────────────────────────────────────────────────────
  async np(message, args, client) {
    const queue = client.distube.getQueue(message.guild);
    if (!queue?.songs.length) return reply(message, 0xED4245, '❌ Nothing is playing!');

    const msg = await message.reply({
      embeds: [buildNpEmbed(queue)],
      components: buildNpRows(queue),
    });

    attachNpCollector(msg, message.guild, client, payload => msg.edit(payload));
  },

  // ── volume / vol ─────────────────────────────────────────────────────────
  async volume(message, args, client) {
    const queue = client.distube.getQueue(message.guild);
    if (!queue) return reply(message, 0xED4245, '❌ Nothing is playing!');
    if (!args[0]) return reply(message, 0x5865F2, `🔊 Current volume: **${queue.volume}%**`);
    const level = parseInt(args[0]);
    if (isNaN(level) || level < 1 || level > 150)
      return reply(message, 0xED4245, '❌ Volume must be between 1 and 150.');
    await client.distube.setVolume(message.guild, level);
    reply(message, 0x57F287, `🔊 Volume set to **${level}%**`);
  },

  // ── loop ─────────────────────────────────────────────────────────────────
  async loop(message, args, client) {
    const queue = client.distube.getQueue(message.guild);
    if (!queue) return reply(message, 0xED4245, '❌ Nothing is playing!');
    const modes = { off: 0, song: 1, queue: 2 };
    const input = args[0]?.toLowerCase();
    if (!(input in modes))
      return reply(message, 0xED4245, '❌ Usage: `!loop <off | song | queue>`');
    await client.distube.setRepeatMode(message.guild, modes[input]);
    const labels = ['🚫 Loop Off', '🔂 Loop Song', '🔁 Loop Queue'];
    reply(message, 0x5865F2, `Loop set to **${labels[modes[input]]}**`);
  },

  // ── shuffle ──────────────────────────────────────────────────────────────
  async shuffle(message, args, client) {
    const queue = client.distube.getQueue(message.guild);
    if (!queue || queue.songs.length < 2)
      return reply(message, 0xED4245, '❌ Not enough songs to shuffle!');
    await client.distube.shuffle(message.guild);
    reply(message, 0x57F287, `🔀 Shuffled **${queue.songs.length - 1}** songs.`);
  },

  // ── remove ───────────────────────────────────────────────────────────────
  async remove(message, args, client) {
    const queue = client.distube.getQueue(message.guild);
    if (!queue?.songs.length) return reply(message, 0xED4245, '❌ Queue is empty!');
    const pos = parseInt(args[0]);
    if (isNaN(pos) || pos < 1 || pos >= queue.songs.length)
      return reply(message, 0xED4245, `❌ Usage: \`!remove <1–${queue.songs.length - 1}>\``);
    const removed = queue.songs.splice(pos, 1)[0];
    reply(message, 0xFEE75C, `🗑️ Removed **${removed.name}**`);
  },

  // ── seek ─────────────────────────────────────────────────────────────────
  async seek(message, args, client) {
    const queue = client.distube.getQueue(message.guild);
    if (!queue) return reply(message, 0xED4245, '❌ Nothing is playing!');
    const input = args[0];
    if (!input) return reply(message, 0xED4245, '❌ Usage: `!seek 1:30` or `!seek 90`');
    let seconds = 0;
    if (input.includes(':')) {
      const p = input.split(':').map(Number);
      seconds = p.length === 2 ? p[0] * 60 + p[1] : p[0] * 3600 + p[1] * 60 + p[2];
    } else {
      seconds = parseInt(input);
    }
    if (isNaN(seconds)) return reply(message, 0xED4245, '❌ Invalid time.');
    await client.distube.seek(message.guild, seconds);
    const fmt = new Date(seconds * 1000).toISOString().substr(11, 8).replace(/^00:/, '');
    reply(message, 0x57F287, `⏩ Seeked to **${fmt}**`);
  },

  // ── disconnect / dc / leave ───────────────────────────────────────────────
  async disconnect(message, args, client) {
    const queue = client.distube.getQueue(message.guild);
    if (queue) await client.distube.stop(message.guild);
    const vc = message.guild.members.me.voice.channel;
    if (!vc) return reply(message, 0xED4245, '❌ Not in a voice channel!');
    message.guild.members.me.voice.disconnect();
    reply(message, 0x5865F2, '👋 Disconnected.');
  },

  // ── sticky ───────────────────────────────────────────────────────────────
  async sticky(message, args, client) {
    if (!message.member.permissions.has('ManageMessages'))
      return reply(message, 0xED4245, '❌ You need the **Manage Messages** permission to use sticky.');

    const sub = args[0]?.toLowerCase();
    const data    = client.stickyData;
    const guildId = message.guild.id;

    if (sub === 'set') {
      // !sticky set #channel message content here
      const channelMention = args[1];
      const channelId = channelMention?.replace(/[<#>]/g, '');
      const channel = channelId ? message.guild.channels.cache.get(channelId) : null;
      if (!channel) return reply(message, 0xED4245, '❌ Usage: `!sticky set #channel <message>`');

      const content = args.slice(2).join(' ');
      if (!content) return reply(message, 0xED4245, '❌ Please provide a message after the channel.');

      if (!data[guildId]) data[guildId] = {};
      const existing = data[guildId][channel.id];

      if (existing?.messageId) {
        const old = await channel.messages.fetch(existing.messageId).catch(() => null);
        if (old) await old.delete().catch(() => {});
      }

      data[guildId][channel.id] = { content, messageId: null };
      saveData(data);

      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(content).setFooter({ text: '📌 Sticky Message' });
      const sent = await channel.send({ embeds: [embed] }).catch(() => null);
      if (sent) { data[guildId][channel.id].messageId = sent.id; saveData(data); }

      return reply(message, 0x57F287, `✅ Sticky message set in ${channel}!`);
    }

    if (sub === 'remove') {
      // !sticky remove #channel
      const channelId = args[1]?.replace(/[<#>]/g, '');
      const channel = channelId ? message.guild.channels.cache.get(channelId) : null;
      if (!channel) return reply(message, 0xED4245, '❌ Usage: `!sticky remove #channel`');

      const sticky = data[guildId]?.[channel.id];
      if (!sticky) return reply(message, 0xED4245, `❌ No sticky message in ${channel}!`);

      if (sticky.messageId) {
        const old = await channel.messages.fetch(sticky.messageId).catch(() => null);
        if (old) await old.delete().catch(() => {});
      }

      delete data[guildId][channel.id];
      if (!Object.keys(data[guildId]).length) delete data[guildId];
      saveData(data);

      return reply(message, 0x57F287, `✅ Sticky message removed from ${channel}!`);
    }

    if (sub === 'list') {
      const guild = data[guildId];
      if (!guild || !Object.keys(guild).length)
        return reply(message, 0xED4245, '❌ No sticky messages set in this server!');

      const lines = Object.entries(guild).map(([chId, s]) => `📌 <#${chId}>\n> ${s.content}`).join('\n\n');
      return message.reply({ embeds: [
        new EmbedBuilder().setColor(0x5865F2).setTitle('📌 Sticky Messages').setDescription(lines)
          .setFooter({ text: `${Object.keys(guild).length} sticky message(s)` })
      ]});
    }

    return reply(message, 0xED4245, '❌ Usage: `!sticky set #channel <message>` | `!sticky remove #channel` | `!sticky list`');
  },

  // ── autoplay ─────────────────────────────────────────────────────────────
  async autoplay(message, args, client) {
    const queue = client.distube.getQueue(message.guild);
    if (!queue) return reply(message, 0xED4245, '❌ Nothing is playing right now!');
    const newState = await client.distube.toggleAutoplay(message.guild);
    reply(message, newState ? 0x57F287 : 0xED4245, `🤖 Autoplay is now **${newState ? 'ON' : 'OFF'}**`);
  },

  // ── help ─────────────────────────────────────────────────────────────────
  async help(message) {
    message.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🤖 Bot — Prefix Commands')
        .setDescription('Prefix: `!`')
        .addFields(
          { name: '🎵 Playback', value: '`!play <song>` `!pause` `!skip` `!stop`', inline: false },
          { name: '📋 Queue',    value: '`!queue` `!remove <#>` `!shuffle`', inline: false },
          { name: '🎛️ Controls', value: '`!volume <1-150>` `!loop <off/song/queue>` `!seek <time>`', inline: false },
          { name: '📺 Info',     value: '`!np` `!autoplay`', inline: false },
          { name: '📌 Sticky',   value: '`!sticky set #channel <msg>` `!sticky remove #channel` `!sticky list`', inline: false },
          { name: '🔧 Other',    value: '`!dc` `!help`', inline: false },
          { name: '✨ Slash',    value: 'All commands also work with `/`', inline: false },
        )
    ]});
  },
};

// aliases
COMMANDS.p  = COMMANDS.play;
COMMANDS.s  = COMMANDS.skip;
COMMANDS.q  = COMMANDS.queue;
COMMANDS.np = COMMANDS.np;
COMMANDS.nowplaying = COMMANDS.np;
COMMANDS.vol  = COMMANDS.volume;
COMMANDS.dc   = COMMANDS.disconnect;
COMMANDS.leave = COMMANDS.disconnect;
COMMANDS.resume = COMMANDS.pause;

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd  = args.shift().toLowerCase();

    const handler = COMMANDS[cmd];
    if (!handler) return;

    try {
      await handler(message, args, client);
    } catch (err) {
      console.error(`Prefix command error [${cmd}]:`, err);
      reply(message, 0xED4245, `❌ Error: \`${err.message}\``);
    }
  },
};
