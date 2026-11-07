export default () => ({
  cmd: ["play", "song"],
  desc: "Download a song from YouTube. (Needs yt-search + audio API)",
  usage: "play <song name>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const searchQuery = (args.join(" ") || "").trim();

    if (!searchQuery) {
      return sendMessageWTyping(from, {
        text: "What song do you want to download?",
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ Music downloader needs yt-search and audio API configuration. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
