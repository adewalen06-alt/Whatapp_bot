export default () => ({
  cmd: ["ai", "gpt", "gemini"],
  desc: "Ask an AI question. (AI backend needs configuration)",
  usage: "ai <question>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const text = msg.key.remoteJid;
    const query = (args.join(" ") || "").trim();

    if (!query) {
      return sendMessageWTyping(from, {
        text: "Usage: `.ai <question>`\nExample: `.ai write a basic html page`",
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, { react: { text: "🤖", key: msg.key } });
    } catch {}

    return sendMessageWTyping(from, {
      text: "❌ AI backend is not configured. Please contact the bot owner to set up AI integration.",
    }, { quoted: msg });
  },
});
