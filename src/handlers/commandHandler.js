const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

function loadCommandsFromDir(dir, client, commands) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      loadCommandsFromDir(fullPath, client, commands);
    } else if (entry.endsWith('.js')) {
      const command = require(fullPath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
      }
    }
  }
}

module.exports = (client) => {
  const commands = [];
  const modulesPath = path.join(__dirname, '..', 'modules');

  // Load commands from every module: src/modules/<module>/commands/
  if (fs.existsSync(modulesPath)) {
    for (const moduleName of fs.readdirSync(modulesPath)) {
      const cmdDir = path.join(modulesPath, moduleName, 'commands');
      loadCommandsFromDir(cmdDir, client, commands);
    }
  }

  client.once('ready', async () => {
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    try {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log(`✅ Registered ${commands.length} slash commands globally.`);
    } catch (err) {
      console.error('Failed to register commands:', err);
    }
  });
};
