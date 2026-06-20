/**
 * Promise-based modal submit waiter for Discord.js v14.
 * discord.js v14 has no built-in awaitModalSubmit on the client,
 * so we manually listen for interactionCreate and resolve on match.
 *
 * @param {import('discord.js').Client} client
 * @param {string} customId  - the modal's customId to wait for
 * @param {string} userId    - only accept submits from this user
 * @param {number} timeoutMs - how long to wait before resolving null
 * @returns {Promise<import('discord.js').ModalSubmitInteraction|null>}
 */
function awaitModal(client, customId, userId, timeoutMs = 30_000) {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      client.off('interactionCreate', handler);
      resolve(null);
    }, timeoutMs);

    function handler(interaction) {
      if (
        interaction.isModalSubmit() &&
        interaction.customId === customId &&
        interaction.user.id === userId
      ) {
        clearTimeout(timer);
        client.off('interactionCreate', handler);
        resolve(interaction);
      }
    }

    client.on('interactionCreate', handler);
  });
}

module.exports = { awaitModal };
