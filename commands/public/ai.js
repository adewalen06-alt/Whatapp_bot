import APIs from "../../lib/api.js";

export default () => ({
  cmd: ["ai", "gpt", "gemini"],
  desc: "Ask an AI question",
  usage: "ai <question>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;
    const query = (args.join(" ") || "").trim();

    if (!query) {
      return sendMessageWTyping(from, {
        text: "Usage: `.ai <question>`\nExample: `.ai write a basic html page`",
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, { react: { text: "🤖", key: msg.key } });
    } catch {}

    let answer;
    const steps = [
      ["Knight chat", () => APIs.knightChatAI(query)],
      ["Knight gpt", () => APIs.knightGptAI(query)],
      ["fallback", () => APIs.fallbackChatAI(query)],
    ];

    for (const [name, run] of steps) {
      try {
        answer = await run();
        if (answer) {
          console.log(`[ai] OK via ${name}`);
          break;
        }
      } catch (err) {
        console.log(`[ai] ${name} failed:`, err?.message || err);
      }
    }

    if (!answer) {
      return sendMessageWTyping(from, {
        text: "❌ Failed to get AI response. Try again later.",
      }, { quoted: msg });
    }

    await sendMessageWTyping(from, { text: answer }, { quoted: msg });
  },
});