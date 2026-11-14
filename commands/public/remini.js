import axios from "axios";

export default () => ({
  cmd: ["remini"],
  desc: "Enhance image quality using AI",
  usage: "remini <url> | reply to image",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal } = msgInfoObj;
    let url = (args.join(" ") || "").trim();

    if (!url && extendedMessageOriginal?.quotedMessage) {
      const quotedMsg = extendedMessageOriginal.quotedMessage;
      if (quotedMsg.imageMessage?.url) {
        url = quotedMsg.imageMessage.url;
      } else {
        return sendMessageWTyping(from, { text: "❌ Reply to an image with .remini" }, { quoted: msg });
      }
    }

    if (!url) {
      return sendMessageWTyping(from, {
        text: "📸 *Remini AI Enhancement Command*\n\nUsage:\n• .remini <image_url>\n• Reply to an image with .remini\n\nExample: .remini https://example.com/image.jpg",
      }, { quoted: msg });
    }

    try {
      new URL(url);
    } catch {
      return sendMessageWTyping(from, { text: "❌ Invalid URL provided." }, { quoted: msg });
    }

    try {
      const apiUrl = `https://api.princetechn.com/api/tools/remini?apikey=prince_tech_api_azfsbshfb&url=${encodeURIComponent(url)}`;
      const response = await axios.get(apiUrl, { timeout: 60000 });
      const data = response.data;

      if (!data?.success || !data?.result?.image_url) {
        throw new Error(data?.error || "Remini API failed");
      }

      const enhancedUrl = data.result.image_url;
      const imageResponse = await axios.get(enhancedUrl, { responseType: 'arraybuffer', timeout: 60000 });
      const imageBuffer = Buffer.from(imageResponse.data);

      return sock.sendMessage(from, {
        image: imageBuffer,
        caption: "✨ *Image Enhanced by Remini AI*",
      }, { quoted: msg });
    } catch (error) {
      console.error("Remini error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to enhance image. Please try again later.",
      }, { quoted: msg });
    }
  },
});