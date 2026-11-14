import axios from "axios";
import { writeExif } from "../../lib/exif.js";

export default () => ({
  cmd: ["igs", "igsc"],
  desc: "Download Instagram post/reel as sticker",
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

    try {
      const apiUrl = `https://api.siputzx.my.id/api/tools/instagram?url=${encodeURIComponent(urlMatch[0])}`;
      const response = await axios.get(apiUrl, { timeout: 30000 });
      const data = response.data;

      if (!data?.status || !data?.result) {
        throw new Error("No result from Instagram API");
      }

      const result = data.result;
      const mediaUrl = result.media_url || result.video_url || result.image_url;

      if (!mediaUrl) {
        return sendMessageWTyping(from, { text: "❌ No media found in this post." }, { quoted: msg });
      }

      const isVideo = mediaUrl.includes(".mp4") || mediaUrl.includes("video");
      const mediaResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 60000 });
      const mediaBuffer = Buffer.from(mediaResponse.data);

      const stickerPath = await writeExif(mediaBuffer, { packname: "eva", author: "jacktheboss220" });
      const stickerBuffer = await import('fs').then(fs => fs.readFileSync(stickerPath));

      return sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
    } catch (error) {
      console.error("[igs] error:", error?.message || error);
      return sendMessageWTyping(from, { text: "❌ Failed to fetch Instagram media. Try another link later." }, { quoted: msg });
    }
  },
});