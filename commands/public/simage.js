import { downloadMediaMessage } from "baileys";
import sharp from "sharp";

export default () => ({
  cmd: ["simage"],
  desc: "Convert a replied sticker to image",
  usage: "simage (reply to sticker)",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal } = msgInfoObj;

    if (!extendedMessageOriginal?.quotedMessage) {
      return sendMessageWTyping(from, {
        text: "❌ Reply to a sticker to convert to image.",
      }, { quoted: msg });
    }

    try {
      const quotedMsg = extendedMessageOriginal.quotedMessage;
      const mediaType = Object.keys(quotedMsg)[0];
      
      if (mediaType !== "stickerMessage") {
        return sendMessageWTyping(from, {
          text: "❌ Reply to a sticker to convert to image.",
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

      const imageBuffer = await sharp(buffer)
        .png()
        .toBuffer();

      await sendMessageWTyping(from, {
        image: imageBuffer,
        caption: "✅ Sticker converted to image!",
      }, { quoted: msg });
    } catch (error) {
      console.error("Simage error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to convert sticker to image. Please try again.",
      }, { quoted: msg });
    }
  },
});