/**
 * Lyrics Finder - Find song lyrics
 */
const axios = require('axios');

module.exports = {
  name: 'lyrics',
  aliases: ['lyric', 'lyr'],
  category: 'media',
  description: 'Find lyrics for a song',
  usage: '.lyrics <song name>',

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    const query = args.join(' ').trim();

    if (!query) {
      return extra.reply('❌ Usage: .lyrics <song name>\n\nExample: .lyrics Shape of You Ed Sheeran');
    }

    try {
      await extra.reply('🎵 Searching for lyrics...');

      const res = await axios.get(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(query.split(' ').slice(0, 2).join(' '))}/${encodeURIComponent(query.split(' ').slice(2).join(' ') || query)}`,
        { timeout: 10000 }
      );

      let lyrics = res.data?.lyrics;
      if (!lyrics) throw new Error('No lyrics found');

      // Trim to WhatsApp message limit
      if (lyrics.length > 3000) {
        lyrics = lyrics.substring(0, 2980) + '\n\n...*(truncated)*';
      }

      await sock.sendMessage(chatId, {
        text: `🎵 *Lyrics: ${query}*\n\n${lyrics}\n\n> Topai Bot`
      }, { quoted: msg });

    } catch (err) {
      // Fallback: try genius via Happi.dev free tier
      try {
        const search = await axios.get(
          `https://api.happi.dev/v1/music?q=${encodeURIComponent(query)}&limit=1&apikey=demo`,
          { timeout: 10000 }
        );
        const track = search.data?.result?.[0];
        if (!track) throw new Error('Not found');

        const lyricsRes = await axios.get(track.api_lyrics, { timeout: 10000 });
        let lyrics = lyricsRes.data?.result?.lyrics;
        if (!lyrics) throw new Error('No lyrics');

        if (lyrics.length > 3000) lyrics = lyrics.substring(0, 2980) + '\n...*(truncated)*';

        await sock.sendMessage(chatId, {
          text: `🎵 *${track.track} — ${track.artist}*\n\n${lyrics}\n\n> Topai Bot`
        }, { quoted: msg });
      } catch (_) {
        extra.reply(`❌ Could not find lyrics for: *${query}*\n\nTip: Try "<song name> <artist name>"`);
      }
    }
  }
};
