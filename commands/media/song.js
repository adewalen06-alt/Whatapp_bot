/**
 * Song Downloader - Download audio from YouTube
 * Fixed: uses @distube/ytdl-core
 */
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

const TMP_DIR = path.join(__dirname, '../../tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

module.exports = {
  name: 'song',
  aliases: ['play', 'music', 'yta'],
  category: 'media',
  description: 'Download audio from YouTube',
  usage: '.song <song name or YouTube link>',

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    const text = args.join(' ').trim();

    if (!text) {
      return extra.reply('❌ Usage: .song <song name or YouTube link>\n\nExample: .song Shape of You');
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

      if (videoDuration > 600) {
        return extra.reply('❌ Video too long (max 10 minutes). Title: ' + videoTitle);
      }

      if (videoThumb) {
        await sock.sendMessage(chatId, {
          image: { url: videoThumb },
          caption: `🎵 *${videoTitle}*\n⬇️ Downloading audio...`
        }, { quoted: msg });
      }

      const tmpFile = path.join(TMP_DIR, `song_${Date.now()}.mp3`);

      await new Promise((resolve, reject) => {
        const stream = ytdl(videoUrl, { quality: 'highestaudio', filter: 'audioonly' });
        const out = fs.createWriteStream(tmpFile);
        stream.pipe(out);
        stream.on('error', reject);
        out.on('finish', resolve);
        out.on('error', reject);
      });

      const audioBuffer = fs.readFileSync(tmpFile);
      try { fs.unlinkSync(tmpFile); } catch (_) {}

      await sock.sendMessage(chatId, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: msg });

    } catch (err) {
      console.error('[song] Error:', err.message);
      extra.reply('❌ Download failed. Try a different link.\n\n' + err.message);
    }
  }
};
