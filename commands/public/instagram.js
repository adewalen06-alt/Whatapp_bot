import axios from "axios";

export default () => ({
  cmd: ["instagram", "ig"],
  desc: "Download Instagram post/reel",
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

    try {
      const apiUrl = `https://api.siputzx.my.id/api/tools/instagram?url=${encodeURIComponent(text)}`;
      const response = await axios.get(apiUrl, { timeout: 30000 });
      const data = response.data;

      if (!data?.status || !data?.result) {
        throw new Error("No result from Instagram API");
      }

      const result = data.result;
      const mediaUrl = result.media_url || result.video_url || result.image_url;

      if (!mediaUrl) {
        return sendMessageWTyping(from, { text: "❌ No downloadable media found." }, { quoted: msg });
      }

      const isVideo = mediaUrl.includes(".mp4") || mediaUrl.includes("video");
      const caption = `📸 *Instagram ${isVideo ? "Video" : "Post"}*\n\n${result.caption || ""}`;

      if (isVideo) {
        return sock.sendMessage(from, {
          video: { url: mediaUrl },
          mimetype: "video/mp4",
          caption,
        }, { quoted: msg });
      } else {
        return sock.sendMessage(from, {
          image: { url: mediaUrl },
          caption,
        }, { quoted: msg });
      }
    } catch (error) {
      console.error("[instagram] error:", error?.message || error);
      return sendMessageWTyping(from, { text: "❌ Failed to fetch Instagram media. Try another link later." }, { quoted: msg });
    }
  },
});