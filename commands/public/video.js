export default () => ({
  cmd: ["video", "ytmp4", "ytv", "ytvid"],
  desc: "Download a video from YouTube or by search. (Needs yt-search + video API)",
  usage: "video <name or URL>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const query = (args.join(" ") || "").trim();

    if (!query) {
      return sendMessageWTyping(from, { text: "Usage: `.video <name or YouTube URL>`" }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ Video downloader needs yt-search and video API configuration. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
