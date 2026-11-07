export default () => ({
  cmd: ["remini"],
  desc: "Enhance image quality using AI. (Needs external API)",
  usage: "remini <url> | reply to image",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const url = (args.join(" ") || "").trim();

    if (!url) {
      return sendMessageWTyping(from, {
        text: "📸 *Remini AI Enhancement Command*\n\nUsage:\n• .remini <image_url>\n• Reply to an image with .remini\n\nExample: .remini https://example.com/image.jpg",
      }, { quoted: msg });
    }

    try {
      new URL(url);
    } catch {
      return sendMessageWTyping(from, { text: "❌ Invalid URL provided." }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ Remini enhancement needs external API. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
