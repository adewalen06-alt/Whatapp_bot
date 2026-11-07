export default () => ({
  cmd: ["ping"],
  desc: "Check bot response time and uptime.",
  usage: "ping",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    function formatTime(seconds) {
      const days = Math.floor(seconds / (24 * 60 * 60));
      seconds = seconds % (24 * 60 * 60);
      const hours = Math.floor(seconds / (60 * 60));
      seconds = seconds % (60 * 60);
      const minutes = Math.floor(seconds / 60);
      seconds = Math.floor(seconds % 60);

      let time = "";
      if (days > 0) time += `${days}d `;
      if (hours > 0) time += `${hours}h `;
      if (minutes > 0) time += `${minutes}m `;
      if (seconds > 0 || time === "") time += `${seconds}s`;

      return time.trim();
    }

    try {
      const start = Date.now();
      await sock.sendMessage(from, { text: "Pong!" }, { quoted: msg });
      const end = Date.now();
      const ping = Math.round((end - start) / 2);

      const uptimeInSeconds = process.uptime();
      const uptimeFormatted = formatTime(uptimeInSeconds);

      const botInfo = `
┏━━〔 🤖 Topai 〕━━┓
┃ 🚀 Ping     : ${ping} ms
┃ ⏱️ Uptime   : ${uptimeFormatted}
┃ 🔖 Version  : v3.0.0
┗━━━━━━━━━━━━━━━━━━━┛`.trim();

      await sock.sendMessage(from, { text: botInfo }, { quoted: msg });
    } catch (error) {
      console.error("Error in ping command:", error);
      await sendMessageWTyping(from, { text: "❌ Failed to get bot status." }, { quoted: msg });
    }
  },
});
