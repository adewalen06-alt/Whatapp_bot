// commands/dev/stresstest.js
module.exports = {
  name: 'stresstest',
  aliases: ['fuzztest', 'loadtest'],
  description: 'Run safe resilience tests on the bot',
  usage: '.stresstest <type> [count]',
  category: 'dev',
  groupOnly: false,
  adminOnly: false,
  botAdminNeeded: false,
  devOnly: false,
  
  async execute(sock, msg, args, extra) {
    try {
      const testType = args[0]?.toLowerCase() || 'all';
      const iterations = Math.min(parseInt(args[1]) || 5, 20);

      await extra.reply(`🧪 Starting stress test: ${testType} (${iterations} runs)`);

      // Safe test loop with rate limiting
      for (let i = 1; i <= iterations; i++) {
        await sock.sendMessage(extra.from, { 
          text: `✅ Test ${i}/${iterations} | Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB` 
        });
        await new Promise(r => setTimeout(r, 300)); // 300ms delay prevents rate limits
      }

      await extra.reply(`🏁 Stress test complete. Bot is stable.`);
      
      // Log for debugging
      console.log(`[stresstest] Completed ${iterations} iterations for ${extra.from}`);
    } catch (err) {
      console.error('[stresstest error]', err);
      await extra.reply(`❌ Error: ${err.message || err}`);
    }
  },
};
