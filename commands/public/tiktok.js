export default () => ({
  cmd: ["tiktok", "tt"],
  desc: "Download TikTok video. (Needs ruhend-scraper API)",
  usage: "tiktok <link>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const text = (args.join(" ") || "").trim();
    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    const url = urlMatch ? urlMatch[0].replace(/[)\]>.,]+$/g, "") : "";

    if (!url) {
      return sendMessageWTyping(from, {
        text: "Please provide a TikTok link.\nExample: `.tiktok https://vm.tiktok.com/...`",
      }, { quoted: msg });
    }

    const TT_PATTERNS = [
      /https?:\/\/(?:www\.)?tiktok\.com\//i,
      /https?:\/\/(?:vm\.)?tiktok\.com\//i,
      /https?:\/\/(?:vt\.)?tiktok\.com\//i,
    ];

    if (!TT_PATTERNS.some((p) => p.test(url))) {
      return sendMessageWTyping(from, { text: "That is not a valid TikTok link." }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ TikTok downloader needs external API. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
