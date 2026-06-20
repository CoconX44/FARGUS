/**
 * Waits for a modal submit interaction after calling showModal().
 * discord.js v14 has no built-in awaitModalSubmit — this uses the
 * interactionCreate event with a timeout.
 */
function awaitModal(client, customId, userId, timeoutMs = 30_000) {
  return new Promise((resolve) => {
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
