import yts from "yt-search";
import APIs from "../lib/api.js";

export default () => ({
  cmd: ["play", "song"],
  desc: "Download a song from YouTube",
  usage: "play <song name>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;
    const searchQuery = (args.join(" ") || "").trim();

    if (!searchQuery) {
      return sendMessageWTyping(from, {
        text: "What song do you want to download?",
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, { react: { text: "🔍", key: msg.key } });
      
      const search = await yts(searchQuery);
      if (!search.videos || search.videos.length === 0) {
        return sendMessageWTyping(from, {
          text: "❌ No results found for your query.",
        }, { quoted: msg });
      }

      const video = search.videos[0];
      const url = video.url;

      let result;
      const attempts = [
        ["Knight", () => APIs.knightSongDownload(url)],
        ["Prince", () => APIs.princeSongDownload(url)],
        ["Hector", () => APIs.hectorSongDownload(url)],
      ];

      for (const [name, run] of attempts) {
        try {
          result = await run();
          if (result?.download) {
            console.log(`[play] OK via ${name}`);
            break;
          }
        } catch (err) {
          console.log(`[play] ${name} failed:`, err?.message || err);
        }
      }

      if (!result?.download) {
        return sendMessageWTyping(from, {
          text: "❌ Failed to download the song. Please try again later.",
        }, { quoted: msg });
      }

      const { download, title, thumbnail } = result;

      await sendMessageWTyping(from, {
        text: `🎵 *Downloading:* ${title || video.title}\n⏳ Please wait...`,
      }, { quoted: msg });

      const buffer = await fetch(download).then(r => r.arrayBuffer());
      const audioBuffer = Buffer.from(buffer);

      await sock.sendMessage(from, {
        audio: audioBuffer,
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: `${title || video.title}.mp3`,
      }, { quoted: msg });

      await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[play] Error:", err);
      return sendMessageWTyping(from, {
        text: "❌ An error occurred. Please try again later.",
      }, { quoted: msg });
    }
  },
});