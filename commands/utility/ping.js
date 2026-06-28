/**
 * Ping Command - Check bot response time
 */
module.exports = {
  name: 'ping',
  aliases: ['p', 'speed', 'latency'],
  category: 'utility',
  description: 'Check bot response time',
  usage: '.ping',

  async execute(sock, msg, args, extra) {
    const start = Date.now();
    const sent = await extra.reply('🏓 Pinging...');
    const elapsed = Date.now() - start;

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🏓 *Pong!*\n\n⚡ Response Time: *${elapsed}ms*\n🤖 Bot is online and running!`
    }, { quoted: msg });
  }
};
