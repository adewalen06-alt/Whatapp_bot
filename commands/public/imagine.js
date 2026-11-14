import axios from "axios";

export default () => ({
  cmd: ["imagine", "imagegen"],
  desc: "Generate an AI image from a prompt",
  usage: "imagine <prompt>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;
    const prompt = (args.join(" ") || "").trim();

    if (!prompt) {
      return sendMessageWTyping(from, {
        text: "Please provide a prompt for the image generation.\nExample: .imagine a beautiful sunset over mountains",
      }, { quoted: msg });
    }

    try {
      const apiUrl = `https://api.siputzx.my.id/api/ai/imagegen?prompt=${encodeURIComponent(prompt)}`;
      const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 60000 });
      const imageBuffer = Buffer.from(response.data);

      return sock.sendMessage(from, { image: imageBuffer, caption: `🎨 AI-generated image: ${prompt}` }, { quoted: msg });
    } catch (error) {
      console.error("Imagine error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to generate image. Please try again later.",
      }, { quoted: msg });
    }
  },
});