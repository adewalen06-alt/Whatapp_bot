/**
 * Instagram to Sticker Command - igs
 * Converts Instagram image/reel to WhatsApp sticker
 */
const axios = require('axios');
const sharp = require('sharp');

module.exports = {
  name: 'igs',
  aliases: ['igsticker'],
  category: 'media',
  description: 'Convert Instagram post to sticker',
  usage: '.igs <Instagram URL>',

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    const url = args.join(' ').trim();

    if (!url) {
      return extra.reply('❌ Usage: .igs <Instagram URL>\n\nConverts an Instagram image to a sticker.');
    }

    const igRegex = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[A-Za-z0-9_-]+/i;
    if (!igRegex.test(url)) {
      return extra.reply('❌ Please provide a valid Instagram post/reel link.');
    }

    try {
      await extra.reply('⏳ Fetching from Instagram...');

      const apiRes = await axios.post(
        'https://snapsave.app/action.php',
        new URLSearchParams({ url }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://snapsave.app/'
          },
          timeout: 20000
        }
      );

      const imgMatch = apiRes.data.match(/href="(https?:\/\/[^"]+\.jpg[^"]*)"/i);
      if (!imgMatch) throw new Error('No image found in the post');

      const imgUrl = imgMatch[1].replace(/&amp;/g, '&');
      const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 20000 });
      const buffer = Buffer.from(imgRes.data);

      const webpBuffer = await sharp(buffer)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp()
        .toBuffer();

      await sock.sendMessage(chatId, { sticker: webpBuffer }, { quoted: msg });

    } catch (err) {
      console.error('[igs] Error:', err.message);
      extra.reply('❌ Failed: ' + err.message + '\n\nMake sure the post is public.');
    }
  }
};
