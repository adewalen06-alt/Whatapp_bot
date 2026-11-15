export default () => ({
  cmd: ["instagram", "ig"],
  desc: "Download Instagram post/reel. (Needs ruhend-scraper API)",
  usage: "instagram <link>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const text = (args.join(" ") || "").trim();

    if (!text) {
      return sendMessageWTyping(from, { text: "Please provide an Instagram link for the video." }, { quoted: msg });
    }

    const instagramPatterns = [
      /https?:\/\/(?:www\.)?instagram\.com\//,
      /https?:\/\/(?:www\.)?instagr\.am\//,
      /https?:\/\/(?:www\.)?instagram\.com\/p\//,
      /https?:\/\/(?:www\.)?instagram\.com\/reel\//,
      /https?:\/\/(?:www\.)?instagram\.com\/tv\//,
    ];

    const isValidUrl = instagramPatterns.some((pattern) => pattern.test(text));

    if (!isValidUrl) {
      return sendMessageWTyping(from, {
        text: "That is not a valid Instagram link. Please provide a valid Instagram post, reel, or video link.",
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ Instagram downloader needs external API. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
