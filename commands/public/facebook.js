export default () => ({
  cmd: ["facebook", "fb"],
  desc: "Download Facebook video. (Needs API configuration)",
  usage: "facebook <link>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const text = (args.join(" ") || "").trim();
    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    const url = urlMatch ? urlMatch[0] : "";

    if (!url) {
      return sendMessageWTyping(from, {
        text: "Please provide a Facebook link.\nExample: `.fb https://facebook.com/reel/...`",
      }, { quoted: msg });
    }

    const fbPatterns = [
      /https?:\/\/(?:www\.|m\.)?facebook\.com\//i,
      /https?:\/\/(?:www\.|m\.)?fb\.com\//i,
      /https?:\/\/fb\.watch\//i,
    ];

    if (!fbPatterns.some((p) => p.test(url))) {
      return sendMessageWTyping(from, { text: "That is not a valid Facebook link." }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ Facebook downloader needs API configuration. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
