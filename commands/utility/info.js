/**
 * Bot Info Command - Show bot information and stats
 */
const os = require('os');
const config = require('../../config');

module.exports = {
  name: 'info',
  aliases: ['botinfo', 'about'],
  category: 'utility',
  description: 'Show bot information and system stats',
  usage: '.info',

  async execute(sock, msg, args, extra) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.rss / 1024 / 1024);
    const totalMemGB = Math.round(os.totalmem() / 1024 / 1024 / 1024 * 10) / 10;

    const nodeVersion = process.version;

    await extra.reply(
      `🤖 *${config.botName} — Bot Info*\n\n` +
      `📦 Version: 2.0.0 (Multi-User)\n` +
      `⚡ Prefix: \`${config.prefix}\`\n` +
      `🔧 Engine: Baileys + Express\n\n` +
      `━━━━━ *System Stats* ━━━━━\n` +
      `⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s\n` +
      `💾 RAM: ${memMB}MB / ${totalMemGB}GB\n` +
      `🖥️ Platform: ${os.platform()} (${os.arch()})\n` +
      `🟢 Node.js: ${nodeVersion}\n\n` +
      `━━━━━ *Features* ━━━━━\n` +
      `✅ Multi-user sessions\n` +
      `✅ YouTube audio/video download\n` +
      `✅ TikTok downloader\n` +
      `✅ AI chat\n` +
      `✅ QR code generator\n` +
      `✅ Translation (50+ languages)\n` +
      `✅ Weather (no API key)\n` +
      `✅ Group management\n\n` +
      `> Topai Bot`
    );
  }
};
