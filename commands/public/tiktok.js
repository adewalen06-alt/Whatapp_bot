import APIs from "../lib/api.js";
import { fetchWhatsAppVideo, slideshowToWhatsAppVideo } from "../lib/waVideo.js";

export default () => ({
  cmd: ["tiktok", "tt"],
  desc: "Download TikTok video",
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

    try {
      await sock.sendMessage(from, { react: { text: "🔍", key: msg.key } });
      
      const dl = await APIs.knightTikTokDownload(url);
      
      if (!dl?.download && !dl?.images?.length) {
        return sendMessageWTyping(from, {
          text: "❌ Failed to download TikTok video. Please try again later.",
        }, { quoted: msg });
      }

      await sendMessageWTyping(from, {
        text: `📥 *Downloading:* ${dl.title || "TikTok Video"}\n⏳ Please wait...`,
      }, { quoted: msg });

      let videoBuffer;
      if (dl.download) {
        videoBuffer = await fetchWhatsAppVideo(dl.download);
      } else if (dl.images?.length) {
        videoBuffer = await slideshowToWhatsAppVideo(dl.images, dl.audio);
      }

      if (!videoBuffer) {
        return sendMessageWTyping(from, {
          text: "❌ Failed to download video.",
        }, { quoted: msg });
      }

      await sock.sendMessage(from, {
        video: videoBuffer,
        mimetype: "video/mp4",
        caption: `📹 ${dl.title || "TikTok Video"}`,
      }, { quoted: msg });

      await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[tiktok] Error:", err);
      return sendMessageWTyping(from, {
        text: "❌ An error occurred. Please try again later.",
      }, { quoted: msg });
    }
  },
});