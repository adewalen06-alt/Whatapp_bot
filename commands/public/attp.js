import axios from "axios";
import { writeExif } from "../../lib/exif.js";

export default () => ({
  cmd: ["attp"],
  desc: "Create an animated text sticker",
  usage: "attp <text>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;
    const text = (args.join(" ") || "").trim();

    if (!text) {
      return sendMessageWTyping(from, { text: "Please provide text after the .attp command." }, { quoted: msg });
    }

    try {
      const apiUrl = `https://api.siputzx.my.id/api/tools/attp?text=${encodeURIComponent(text)}`;
      const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const gifBuffer = Buffer.from(response.data);

      const stickerPath = await writeExif(gifBuffer, { packname: "eva", author: "jacktheboss220" });
      const stickerBuffer = await import('fs').then(fs => fs.readFileSync(stickerPath));
      
      await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
    } catch (error) {
      console.error("ATTP error:", error);
      return sendMessageWTyping(from, { text: "❌ Failed to create attp sticker. Please try again later." }, { quoted: msg });
    }
  },
});