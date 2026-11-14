import axios from "axios";

export default () => ({
  cmd: ["metallic", "ice", "snow", "impressive", "matrix", "light", "neon", "devil", "purple", "thunder", "leaves", "1917", "arena", "hacker", "sand", "blackpink", "glitch", "fire"],
  desc: "Generate stylized text images",
  usage: "<type> <text>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;
    const text = (args.join(" ") || "").trim();

    if (!text) {
      return sendMessageWTyping(from, {
        text: "Please provide text to generate\nExample: .metallic Nick",
      }, { quoted: msg });
    }

    try {
      const type = msgInfoObj.command;
      const apiUrl = `https://mumaker.glitch.me/textpro/${type}?text=${encodeURIComponent(text)}`;
      const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const imageBuffer = Buffer.from(response.data);

      return sock.sendMessage(from, { image: imageBuffer, caption: `${type} text: ${text}` }, { quoted: msg });
    } catch (error) {
      console.error("Text maker error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to generate text image. Please try again later.",
      }, { quoted: msg });
    }
  },
});