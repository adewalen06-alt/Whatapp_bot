const config = require('../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'private',
  aliases: ['priv'],
  description: 'Set bot to private mode — only owner can use commands',
  usage: '.private',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    if (config.selfMode) {
      return extra.reply('🔒 Bot is already in *PRIVATE* mode.\nOnly you (owner) can use commands.');
    }
    updateConfig('selfMode', true);
    config.selfMode = true;
    return extra.reply('🔒 Bot is now *PRIVATE*\n\nOnly you (owner) can use commands.');
  }
};

function updateConfig(key, value) {
  try {
    const configPath = path.join(__dirname, '..', '..', 'config.js');
    let content = fs.readFileSync(configPath, 'utf8');
    content = content.replace(new RegExp(`(${key}:\\s*)(true|false)`, 'g'), `$1${value}`);
    fs.writeFileSync(configPath, content, 'utf8');
    delete require.cache[require.resolve('../../config')];
  } catch (e) {
    console.error('Config update error:', e);
  }
}
