import axios from "axios";
import WSF from "wa-sticker-formatter";
import fs from "fs";
import memoryManager from "../../utils/memory.js";

export default () => ({
  cmd: ["stickertelegram", "tg"],
  desc: "Download Telegram sticker pack",
  usage: "stickertelegram <t.me/addstickers/packname>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;
    const text = (args.join(" ") || "").trim();

    if (!text) {
      return sendMessageWTyping(from, {
        text: "⚠️ Please enter the Telegram sticker URL!\n\nExample: .tg https://t.me/addstickers/Porcientoreal",
      }, { quoted: msg });
    }

    if (!text.match(/https:\/\/t\.me\/addstickers\//gi)) {
      return sendMessageWTyping(from, {
        text: "❌ Invalid URL! Make sure it's a Telegram sticker URL.",
      }, { quoted: msg });
    }

    try {
      const apiUrl = `https://api.siputzx.my.id/api/tools/telegram-sticker?url=${encodeURIComponent(text)}`;
      const response = await axios.get(apiUrl, { timeout: 30000 });
      const data = response.data;

      if (!data?.status || !data?.result) {
        throw new Error("No result from Telegram API");
      }

      const stickers = data.result;
      if (!Array.isArray(stickers) || stickers.length === 0) {
        return sendMessageWTyping(from, { text: "❌ No stickers found in this pack." }, { quoted: msg });
      }

      let sent = 0;
      for (const sticker of stickers) {
        try {
          const stickerResponse = await axios.get(sticker.url, { responseType: 'arraybuffer', timeout: 30000 });
          const stickerBuffer = Buffer.from(stickerResponse.data);
          
          const webpWithMetadata = await WSF.setMetadata("Telegram", "Sticker", stickerBuffer);
          await sock.sendMessage(from, { sticker: Buffer.from(webpWithMetadata) }, { quoted: msg });
          sent++;
          
          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error("Error sending sticker:", err);
        }
      }

      await sendMessageWTyping(from, {
        text: `✅ Downloaded ${sent}/${stickers.length} stickers from Telegram pack!`,
      }, { quoted: msg });
    } catch (error) {
      console.error("[telegram sticker] error:", error?.message || error);
      return sendMessageWTyping(from, { text: "❌ Failed to download Telegram stickers. Try another pack later." }, { quoted: msg });
    }
  },
});