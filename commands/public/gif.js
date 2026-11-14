import axios from "axios";

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || "";

export default () => ({
  cmd: ["gif"],
  desc: "Search for a GIF",
  usage: "gif <search term>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;
    const query = (args.join(" ") || "").trim();

    if (!query) {
      return sendMessageWTyping(from, { text: "Please provide a search term for the GIF." }, { quoted: msg });
    }

    if (!GIPHY_API_KEY) {
      return sendMessageWTyping(from, {
        text: "❌ GIF search needs a Giphy API key. Please contact the bot owner.",
      }, { quoted: msg });
    }

    try {
      const apiUrl = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=1`;
      const response = await axios.get(apiUrl, { timeout: 10000 });
      const data = response.data;

      if (!data?.data || data.data.length === 0) {
        return sendMessageWTyping(from, { text: "❌ No GIFs found for your query." }, { quoted: msg });
      }

      const gifUrl = data.data[0].images.original.url;
      return sock.sendMessage(from, { video: { url: gifUrl }, caption: `🔍 ${query}` }, { quoted: msg });
    } catch (error) {
      console.error("GIF error:", error);
      return sendMessageWTyping(from, { text: "❌ Failed to search GIFs. Please try again later." }, { quoted: msg });
    }
  },
});