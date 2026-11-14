import APIs from "../../lib/api.js";

export default () => ({
  cmd: ["facebook", "fb"],
  desc: "Download Facebook video",
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

    try {
      await sock.sendMessage(from, { react: { text: "🔍", key: msg.key } });

      const dl = await APIs.knightFacebookDownload(url);
      
      if (!dl?.download) {
        return sendMessageWTyping(from, {
          text: "❌ Failed to download Facebook video. Please try again later.",
        }, { quoted: msg });
      }

      await sendMessageWTyping(from, {
        text: `📥 *Downloading:* ${dl.title || "Facebook Video"}\n⏳ Please wait...`,
      }, { quoted: msg });

      const buffer = await fetch(dl.download).then(r => r.arrayBuffer());
      const videoBuffer = Buffer.from(buffer);

      await sock.sendMessage(from, {
        video: videoBuffer,
        mimetype: "video/mp4",
        caption: `📹 ${dl.title || "Facebook Video"}`,
      }, { quoted: msg });

      await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[facebook] Error:", err);
      return sendMessageWTyping(from, {
        text: "❌ An error occurred. Please try again later.",
      }, { quoted: msg });
    }
  },
});