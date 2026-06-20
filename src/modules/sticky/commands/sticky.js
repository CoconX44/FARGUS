const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { saveData } = require('../index');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Manage sticky messages that always stay at the bottom of a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set a sticky message in a channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to place the sticky message in')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('The content of the sticky message')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove the sticky message from a channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to remove the sticky from')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all sticky messages in this server')
    ),

  async execute(interaction, client) {
    const sub     = interaction.options.getSubcommand();
    const data    = client.stickyData;
    const guildId = interaction.guild.id;

    // ── set ────────────────────────────────────────────────────────────────
    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel');
      const content = interaction.options.getString('message');

      if (!data[guildId]) data[guildId] = {};
      const existing = data[guildId][channel.id];

      // remove old sticky message from Discord
      if (existing?.messageId) {
        const old = await channel.messages.fetch(existing.messageId).catch(() => null);
        if (old) await old.delete().catch(() => {});
      }

      // store and post the new sticky
      data[guildId][channel.id] = { content, messageId: null };
      saveData(data);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setDescription(content)
        .setFooter({ text: '📌 Sticky Message' });

      const sent = await channel.send({ embeds: [embed] }).catch(() => null);
      if (sent) {
        data[guildId][channel.id].messageId = sent.id;
        saveData(data);
      }

      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0x57F287).setDescription(`✅ Sticky message set in ${channel}!`)
      ], flags: 64 });
    }

    // ── remove ─────────────────────────────────────────────────────────────
    if (sub === 'remove') {
      const channel = interaction.options.getChannel('channel');
      const sticky  = data[guildId]?.[channel.id];

      if (!sticky) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setColor(0xED4245).setDescription(`❌ No sticky message found in ${channel}!`)
        ], flags: 64 });
      }

      if (sticky.messageId) {
        const old = await channel.messages.fetch(sticky.messageId).catch(() => null);
        if (old) await old.delete().catch(() => {});
      }

      delete data[guildId][channel.id];
      if (!Object.keys(data[guildId]).length) delete data[guildId];
      saveData(data);

      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0x57F287).setDescription(`✅ Sticky message removed from ${channel}!`)
      ], flags: 64 });
    }

    // ── list ───────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const guild = data[guildId];
      if (!guild || !Object.keys(guild).length) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setColor(0xED4245).setDescription('❌ No sticky messages set in this server!')
        ], flags: 64 });
      }

      const lines = Object.entries(guild)
        .map(([chId, s]) => `📌 <#${chId}>\n> ${s.content}`)
        .join('\n\n');

      return interaction.reply({ embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📌 Sticky Messages')
          .setDescription(lines)
          .setFooter({ text: `${Object.keys(guild).length} sticky message(s)` })
      ], flags: 64 });
    }
  },
};
