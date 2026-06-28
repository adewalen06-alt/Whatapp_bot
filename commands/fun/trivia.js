/**
 * Trivia Command - Random trivia questions
 */
const axios = require('axios');

module.exports = {
  name: 'trivia',
  aliases: ['quiz', 'q'],
  category: 'fun',
  description: 'Get a random trivia question',
  usage: '.trivia',

  async execute(sock, msg, args, extra) {
    try {
      const res = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', { timeout: 10000 });
      const item = res.data?.results?.[0];
      if (!item) return extra.reply('❌ Failed to get trivia question. Try again.');

      const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");

      const question = decode(item.question);
      const correct = decode(item.correct_answer);
      const all = [...item.incorrect_answers.map(decode), correct].sort(() => Math.random() - 0.5);
      const labels = ['A', 'B', 'C', 'D'];

      const options = all.map((opt, i) => `${labels[i]}. ${opt}`).join('\n');
      const correctLabel = labels[all.indexOf(correct)];

      await extra.reply(
        `🧠 *Trivia Question*\n` +
        `📚 Category: ${decode(item.category)}\n` +
        `⚡ Difficulty: ${item.difficulty}\n\n` +
        `❓ ${question}\n\n` +
        `${options}\n\n` +
        `||Answer: *${correctLabel}. ${correct}*||`
      );
    } catch (err) {
      extra.reply('❌ Failed to fetch trivia: ' + err.message);
    }
  }
};
