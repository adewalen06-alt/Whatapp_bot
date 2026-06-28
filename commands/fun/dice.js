/**
 * Dice Roll Command
 */
module.exports = {
  name: 'dice',
  aliases: ['roll', 'd6'],
  category: 'fun',
  description: 'Roll a dice (1-6) or specify sides: .dice 20',
  usage: '.dice [sides]',

  async execute(sock, msg, args, extra) {
    const sides = parseInt(args[0]) || 6;
    if (sides < 2 || sides > 1000) {
      return extra.reply('❌ Dice sides must be between 2 and 1000.');
    }
    const result = Math.floor(Math.random() * sides) + 1;
    const emojis = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };
    const display = sides === 6 ? (emojis[result] || result) : result;
    await extra.reply(`🎲 *Dice Roll (d${sides})*\n\nResult: *${display}*`);
  }
};
