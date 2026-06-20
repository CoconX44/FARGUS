const fs   = require('fs');
const path = require('path');

function setupFishing() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  console.log('[fishing] module loaded');
}

module.exports = { setupFishing };
