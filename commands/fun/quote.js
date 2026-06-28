/**
 * Quote Command - Random motivational quote
 */
const axios = require('axios');

module.exports = {
  name: 'quote',
  aliases: ['motivation', 'inspire'],
  category: 'fun',
  description: 'Get a random motivational quote',
  usage: '.quote',

  async execute(sock, msg, args, extra) {
    try {
      const res = await axios.get('https://api.quotable.io/random', { timeout: 10000 });
      const { content, author, tags } = res.data;
      await extra.reply(
        `💬 *Quote of the Moment*\n\n"${content}"\n\n— *${author}*\n\n` +
        `🏷️ ${tags?.join(', ') || 'motivation'}\n\n> Topai Bot`
      );
    } catch (_) {
      // Fallback to a local set
      const quotes = [
        ["The only way to do great work is to love what you do.", "Steve Jobs"],
        ["Believe you can and you're halfway there.", "Theodore Roosevelt"],
        ["In the middle of difficulty lies opportunity.", "Albert Einstein"],
        ["It does not matter how slowly you go as long as you do not stop.", "Confucius"],
        ["Success is not final, failure is not fatal: it is the courage to continue that counts.", "Winston Churchill"]
      ];
      const [q, a] = quotes[Math.floor(Math.random() * quotes.length)];
      extra.reply(`💬 *Quote*\n\n"${q}"\n\n— *${a}*\n\n> Topai Bot`);
    }
  }
};
