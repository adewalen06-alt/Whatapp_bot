import yts from "yt-search";
import APIs from "../../lib/api.js";

export default () => ({
  cmd: ["video", "ytmp4", "ytv", "ytvid"],
  desc: "Download a video from YouTube or by search",
  usage: "video <name or URL>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;
    const query = (args.join(" ") || "").trim();

    if (!query) {
      return sendMessageWTyping(from, { text: "Usage: `.video <name or YouTube URL>`" }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, { react: { text: "🔍", key: msg.key } });

      let url;
      if (query.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/i)) {
        url = query;
      } else {
        const search = await yts(query);
        if (!search.videos || search.videos.length === 0) {
          return sendMessageWTyping(from, { text: "❌ No results found for your query." }, { quoted: msg });
        }
        url = search.videos[0].url;
      }

      let result;
      const attempts = [
        ["Knight", () => APIs.knightVideoDownload(url)],
        ["Prince", () => APIs.princeVideoDownload(url)],
        ["Hector", () => APIs.hectorVideoDownload(url)],
      ];

      for (const [name, run] of attempts) {
        try {
          result = await run();
          if (result?.download) {
            console.log(`[video] OK via ${name}`);
            break;
          }
        } catch (err) {
          console.log(`[video] ${name} failed:`, err?.message || err);
        }
      }

      if (!result?.download) {
        return sendMessageWTyping(from, { text: "❌ Failed to download the video. Please try again later." }, { quoted: msg });
      }

      const { download, title } = result;

      await sendMessageWTyping(from, {
        text: `📹 *Downloading:* ${title || "Video"}\n⏳ Please wait...`,
      }, { quoted: msg });

      const buffer = await fetch(download).then(r => r.arrayBuffer());
      const videoBuffer = Buffer.from(buffer);

      await sock.sendMessage(from, {
        video: videoBuffer,
        mimetype: "video/mp4",
        caption: `📹 ${title || "Video"}`,
      }, { quoted: msg });

      await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[video] Error:", err);
      return sendMessageWTyping(from, { text: "❌ An error occurred. Please try again later." }, { quoted: msg });
    }
  },
});