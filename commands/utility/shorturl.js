/**
 * URL Shortener Command
 */
const axios = require('axios');

module.exports = {
  name: 'shorten',
  aliases: ['shorturl', 'short', 'bitly'],
  category: 'utility',
  description: 'Shorten a long URL',
  usage: '.shorten <URL>',

  async execute(sock, msg, args, extra) {
    const url = args.join(' ').trim();
    if (!url) return extra.reply('❌ Usage: .shorten <URL>\n\nExample: .shorten https://very-long-url.com/...');

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return extra.reply('❌ Please provide a valid URL starting with http:// or https://');
    }

    try {
      // Use is.gd free URL shortener (no API key needed)
      const res = await axios.get('https://is.gd/create.php', {
        params: { format: 'json', url },
        timeout: 10000
      });

      if (res.data?.shorturl) {
        await extra.reply(`🔗 *URL Shortener*\n\n📎 Original: ${url.substring(0, 60)}...\n✅ Shortened: *${res.data.shorturl}*\n\n> Topai Bot`);
      } else {
        throw new Error(res.data?.errormessage || 'Failed to shorten');
      }
    } catch (err) {
      extra.reply('❌ Failed to shorten URL: ' + err.message);
    }
  }
};
