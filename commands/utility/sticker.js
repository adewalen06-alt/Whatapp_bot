/**
 * Sticker Command - Convert image/video to sticker
 */
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const TMP_DIR = path.join(__dirname, '../../tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

module.exports = {
  name: 'sticker',
  aliases: ['s', 'stiker'],
  category: 'utility',
  description: 'Convert image to WhatsApp sticker',
  usage: '.sticker (reply to an image)',

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;

    // Get quoted message or current message with image
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mediaMsg = quoted || msg.message;

    const hasImage = mediaMsg?.imageMessage || mediaMsg?.stickerMessage;
    if (!hasImage) {
      return extra.reply('❌ Reply to an image to convert it to a sticker.\n\nUsage: .sticker (reply to image)');
    }

    try {
      await extra.reply('⏳ Creating sticker...');

      let buffer;
      if (quoted) {
        // Build a fake message object for downloading
        const fakeMsg = {
          key: msg.key,
          message: quoted
        };
        buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
      } else {
        buffer = await downloadMediaMessage(msg, 'buffer', {});
      }

      const config = require('../../config');
      const packname = config.packname || 'Topai';
      const author = config.botName || 'Topai Bot';

      // Convert to WebP using sharp
      const webpBuffer = await sharp(buffer)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp()
        .toBuffer();

      await sock.sendMessage(chatId, {
        sticker: webpBuffer
      }, { quoted: msg });

    } catch (err) {
      console.error('[sticker] Error:', err.message);
      extra.reply('❌ Failed to create sticker: ' + err.message);
    }
  }
};
