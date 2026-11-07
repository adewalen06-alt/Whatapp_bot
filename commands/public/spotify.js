export default () => ({
  cmd: ["spotify"],
  desc: "Search Spotify for a track. (Needs external API)",
  usage: "spotify <song/artist>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const query = (args.join(" ") || "").trim();

    if (!query) {
      return sendMessageWTyping(from, { text: "Usage: .spotify <song/artist/keywords>\nExample: .spotify con calma" }, { quoted: msg });
    }

    try {
      const apiUrl = `https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(query)}`;
      const res = await fetch(apiUrl, { timeout: 20000, headers: { "user-agent": "Mozilla/5.0" } });
      const data = await res.json();

      if (!data?.status || !data?.result) {
        throw new Error("No result from Spotify API");
      }

      const r = data.result;
      const audioUrl = r.audio;
      if (!audioUrl) {
        return sendMessageWTyping(from, { text: "No downloadable audio found for this query." }, { quoted: msg });
      }

      const caption = `🎵 ${r.title || r.name || "Unknown Title"}\n👤 ${r.artist || ""}\n⏱ ${r.duration || ""}\n🔗 ${r.url || ""}`.trim();

      if (r.thumbnails) {
        await sock.sendMessage(from, { image: { url: r.thumbnails }, caption }, { quoted: msg });
      } else if (caption) {
        await sendMessageWTyping(from, { text: caption }, { quoted: msg });
      }

      return sock.sendMessage(from, {
        audio: { url: audioUrl },
        mimetype: "audio/mpeg",
        fileName: `${(r.title || r.name || "track").replace(/[\\/:*?"<>|]/g, "")}.mp3`,
      }, { quoted: msg });
    } catch (error) {
      console.error("[SPOTIFY] error:", error?.message || error);
      return sendMessageWTyping(from, { text: "Failed to fetch Spotify audio. Try another query later." }, { quoted: msg });
    }
  },
});
