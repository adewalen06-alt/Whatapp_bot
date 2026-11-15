export default () => ({
  cmd: ["stickertelegram", "tg"],
  desc: "Download Telegram sticker pack. (Needs ffmpeg + webpmux)",
  usage: "stickertelegram <t.me/addstickers/packname>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const text = (args.join(" ") || "").trim();

    if (!text) {
      return sendMessageWTyping(from, {
        text: "⚠️ Please enter the Telegram sticker URL!\n\nExample: .tg https://t.me/addstickers/Porcientoreal",
      }, { quoted: msg });
    }

    if (!text.match(/https:\/\/t\.me\/addstickers\//gi)) {
      return sendMessageWTyping(from, {
        text: "❌ Invalid URL! Make sure it's a Telegram sticker URL.",
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ Telegram sticker download needs ffmpeg + webpmux. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
