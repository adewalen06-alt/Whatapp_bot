/**
 * Video Downloader - Download video from YouTube
 * Fixed: uses @distube/ytdl-core
 */
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

const TMP_DIR = path.join(__dirname, '../../tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

module.exports = {
  name: 'ytvideo',
  aliases: ['ytv', 'ytmp4', 'video'],
  category: 'media',
  description: 'Download video from YouTube',
  usage: '.video <video name or URL>',

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    const text = args.join(' ').trim();

    if (!text) {
      return extra.reply('❌ Usage: .video <video name or URL>\n\nExample: .video Blinding Lights');
    }

    try {
      await extra.reply('⏳ Searching...');

      let videoUrl, videoTitle, videoThumb, videoDuration;

      if (ytdl.validateURL(text)) {
        videoUrl = text;
        const info = await ytdl.getBasicInfo(text);
        videoTitle = info.videoDetails.title;
        videoThumb = info.videoDetails.thumbnails.pop()?.url;
        videoDuration = parseInt(info.videoDetails.lengthSeconds);
      } else {
        const search = await yts(text);
        if (!search?.videos?.length) return extra.reply('❌ No results found for: ' + text);
        const v = search.videos[0];
        videoUrl = v.url;
        videoTitle = v.title;
        videoThumb = v.thumbnail;
        videoDuration = v.seconds || 0;
      }

      if (videoDuration > 300) {
        return extra.reply('❌ Video too long (max 5 minutes for video download). Use .song for audio of longer content.\n\nTitle: ' + videoTitle);
      }

      if (videoThumb) {
        await sock.sendMessage(chatId, {
          image: { url: videoThumb },
          caption: `🎬 *${videoTitle}*\n⬇️ Downloading video...`
        }, { quoted: msg });
      }

      const tmpFile = path.join(TMP_DIR, `video_${Date.now()}.mp4`);

      await new Promise((resolve, reject) => {
        const stream = ytdl(videoUrl, { quality: 'highest', filter: 'videoandaudio' });
        const out = fs.createWriteStream(tmpFile);
        stream.pipe(out);
        stream.on('error', reject);
        out.on('finish', resolve);
        out.on('error', reject);
      });

      const videoBuffer = fs.readFileSync(tmpFile);
      try { fs.unlinkSync(tmpFile); } catch (_) {}

      await sock.sendMessage(chatId, {
        video: videoBuffer,
        mimetype: 'video/mp4',
        caption: `🎬 *${videoTitle}*`
      }, { quoted: msg });

    } catch (err) {
      console.error('[video] Error:', err.message);
      extra.reply('❌ Download failed. Try a shorter video or different link.\n\n' + err.message);
    }
  }
};
