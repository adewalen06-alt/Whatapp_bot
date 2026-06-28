/**
 * Coin Flip Command
 */
module.exports = {
  name: 'coinflip',
  aliases: ['flip', 'coin', 'toss'],
  category: 'fun',
  description: 'Flip a coin — heads or tails',
  usage: '.coinflip',

  async execute(sock, msg, args, extra) {
    const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    const emoji = result === 'HEADS' ? '🪙' : '🟡';
    await extra.reply(`${emoji} *Coin Flip Result:* ${result}!`);
  }
};
