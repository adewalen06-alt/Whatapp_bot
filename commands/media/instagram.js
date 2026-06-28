/**
 * Instagram Downloader - Download Instagram posts/reels
 * Fixed: uses direct API instead of broken ruhend-scraper
 */
const axios = require('axios');

module.exports = {
  name: 'ig',
  aliases: ['instagram', 'igdl', 'reels'],
  category: 'media',
  description: 'Download Instagram photo/video/reel',
  usage: '.ig <Instagram URL>',

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    const url = args.join(' ').trim();

    if (!url) {
      return extra.reply('❌ Usage: .ig <Instagram URL>\n\nExample: .ig https://www.instagram.com/p/...');
    }

    const igRegex = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[A-Za-z0-9_-]+/i;
    if (!igRegex.test(url)) {
      return extra.reply('❌ Please provide a valid Instagram post/reel link.');
    }

    try {
      await extra.reply('⏳ Downloading from Instagram...');

      // Use instaloader API proxy (SnapSave compatible)
      const apiRes = await axios.post(
        'https://snapsave.app/action.php',
        new URLSearchParams({ url }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://snapsave.app/'
          },
          timeout: 20000
        }
      );

      const body = apiRes.data;
      // Parse download links from response
      const videoMatch = body.match(/href="(https?:\/\/[^"]+\.mp4[^"]*)"/i);
      const imgMatch = body.match(/href="(https?:\/\/[^"]+\.jpg[^"]*)"/i);

      if (videoMatch) {
        const videoUrl = videoMatch[1].replace(/&amp;/g, '&');
        await sock.sendMessage(chatId, {
          video: { url: videoUrl },
          caption: '📸 Downloaded via Topai Bot',
          mimetype: 'video/mp4'
        }, { quoted: msg });
      } else if (imgMatch) {
        const imgUrl = imgMatch[1].replace(/&amp;/g, '&');
        await sock.sendMessage(chatId, {
          image: { url: imgUrl },
          caption: '📸 Downloaded via Topai Bot'
        }, { quoted: msg });
      } else {
        throw new Error('No media found in the post');
      }

    } catch (err) {
      console.error('[instagram] Error:', err.message);
      extra.reply('❌ Failed to download. Make sure the post is public.\n\nError: ' + err.message);
    }
  }
};
