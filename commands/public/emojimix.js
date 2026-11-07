export default () => ({
  cmd: ["emojimix"],
  desc: "Mix two emojis into a sticker. (Requires ffmpeg + Tenor API)",
  usage: "emojimix <emoji1>+<emoji2>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const text = (args.join(" ") || "").trim();

    if (!text) {
      return sendMessageWTyping(from, { text: "🎴 Example: .emojimix 😎+🥰" }, { quoted: msg });
    }

    if (!text.includes("+")) {
      return sendMessageWTyping(from, {
        text: "✳️ Separate the emoji with a *+* sign\n\n📌 Example:\n*.emojimix* 😎+🥰",
      }, { quoted: msg });
    }

    const [emoji1, emoji2] = text.split("+").map((e) => e.trim());

    try {
      const url = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return sendMessageWTyping(from, {
          text: "❌ These emojis cannot be mixed! Try different ones.",
        }, { quoted: msg });
      }

      const imageUrl = data.results[0].url;
      return sock.sendMessage(from, { image: { url: imageUrl } }, { quoted: msg });
    } catch (error) {
      console.error("Error in emojimix command:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to mix emojis! Make sure you're using valid emojis.\n\nExample: .emojimix 😎+🥰",
      }, { quoted: msg });
    }
  },
});
