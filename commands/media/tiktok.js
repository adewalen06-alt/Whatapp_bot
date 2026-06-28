/**
 * TikTok Downloader - Download TikTok videos without watermark
 * Fixed: uses direct API instead of broken ruhend-scraper
 */
const axios = require('axios');

module.exports = {
  name: 'tiktok',
  aliases: ['tt', 'ttdl', 'tiktokdl'],
  category: 'media',
  description: 'Download TikTok video (no watermark)',
  usage: '.tiktok <TikTok URL>',

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    const url = args.join(' ').trim();

    if (!url) {
      return extra.reply('❌ Usage: .tiktok <TikTok URL>\n\nExample: .tiktok https://vm.tiktok.com/...');
    }

    const tiktokRegex = /https?:\/\/(?:www\.|vm\.|vt\.|m\.)?tiktok\.com\/[^\s]+/i;
    if (!tiktokRegex.test(url)) {
      return extra.reply('❌ Please provide a valid TikTok link.');
    }

    try {
      await extra.reply('⏳ Downloading TikTok video...');

      // Try Tikwm API (free, reliable)
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
      const response = await axios.get(apiUrl, { timeout: 20000 });
      const data = response.data;

      if (!data?.data?.play) {
        throw new Error('No download link returned');
      }

      const videoData = data.data;
      const downloadUrl = videoData.hdplay || videoData.play;
      const title = videoData.title || 'TikTok Video';
      const author = videoData.author?.nickname || 'TikTok';

      await sock.sendMessage(chatId, {
        video: { url: downloadUrl },
        caption: `🎵 *${title}*\n👤 @${author}\n\n> Downloaded via Topai Bot`,
        mimetype: 'video/mp4'
      }, { quoted: msg });

    } catch (err) {
      console.error('[tiktok] Error:', err.message);
      extra.reply('❌ Failed to download TikTok video. Make sure the link is valid and public.\n\nError: ' + err.message);
    }
  }
};
