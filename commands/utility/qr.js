/**
 * QR Code Generator - Generate QR code from text/URL
 */
const QRCode = require('qrcode');

module.exports = {
  name: 'qr',
  aliases: ['qrcode', 'makeqr'],
  category: 'utility',
  description: 'Generate a QR code from any text or URL',
  usage: '.qr <text or URL>',

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    const text = args.join(' ').trim();

    if (!text) {
      return extra.reply('❌ Usage: .qr <text or URL>\n\nExample: .qr https://google.com');
    }

    try {
      const qrBuffer = await QRCode.toBuffer(text, {
        type: 'png',
        width: 512,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });

      await sock.sendMessage(chatId, {
        image: qrBuffer,
        caption: `📱 *QR Code Generated*\n\nContent: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n\n> Topai Bot`
      }, { quoted: msg });

    } catch (err) {
      extra.reply('❌ Failed to generate QR code: ' + err.message);
    }
  }
};
