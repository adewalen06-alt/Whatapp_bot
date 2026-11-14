import { downloadMediaMessage } from "baileys";
import WSF from "wa-sticker-formatter";
import memoryManager from "../../utils/memory.js";

export default () => ({
  cmd: ["sticker-alt"],
  desc: "Convert replied image/video to sticker",
  usage: "sticker-alt (reply to image/video)",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal } = msgInfoObj;

    if (!extendedMessageOriginal?.quotedMessage) {
      return sendMessageWTyping(from, {
        text: "❌ Reply to an image or video to convert to sticker.",
      }, { quoted: msg });
    }

    try {
      const quotedMsg = extendedMessageOriginal.quotedMessage;
      const mediaType = Object.keys(quotedMsg)[0];
      
      if (!["imageMessage", "videoMessage"].includes(mediaType)) {
        return sendMessageWTyping(from, {
          text: "❌ Reply to an image or video to convert to sticker.",
        }, { quoted: msg });
      }

      const stream = await downloadMediaMessage(
        { message: quotedMsg },
        "stream",
        {},
        { logger: console }
      );

      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      const stickerBuffer = await WSF.setMetadata("eva", "jacktheboss220", buffer);
      await sendMessageWTyping(from, { sticker: Buffer.from(stickerBuffer) }, { quoted: msg });
    } catch (error) {
      console.error("StickerAlt error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to convert media to sticker. Please try again.",
      }, { quoted: msg });
    }
  },
});