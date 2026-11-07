export default () => ({
  cmd: ["igs", "igsc"],
  desc: "Download Instagram post/reel as sticker. (Needs API + ffmpeg)",
  usage: "igs <instagram link>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const text = (args.join(" ") || "").trim();
    const urlMatch = text.match(/https?:\/\/\S+/);

    if (!urlMatch) {
      return sendMessageWTyping(from, {
        text: "Send an Instagram post/reel link.\nUsage:\n.igs <url>\n.igsc <url>",
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ Instagram downloader needs external API and ffmpeg. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
