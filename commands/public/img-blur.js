import { downloadMediaMessage } from "baileys";
import sharp from "sharp";

export default () => ({
  cmd: ["blur", "img-blur"],
  desc: "Blur an image. Reply to an image or send one with caption.",
  usage: "blur | reply to image",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal } = msgInfoObj;

    if (!extendedMessageOriginal?.quotedMessage) {
      return sendMessageWTyping(from, {
        text: "❌ Reply to an image to blur it.",
      }, { quoted: msg });
    }

    try {
      const quotedMsg = extendedMessageOriginal.quotedMessage;
      const mediaType = Object.keys(quotedMsg)[0];
      
      if (mediaType !== "imageMessage") {
        return sendMessageWTyping(from, {
          text: "❌ Reply to an image to blur it.",
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

      const blurLevel = parseFloat(args[0]) || 5;
      const imageBuffer = await sharp(buffer)
        .blur(blurLevel)
        .toBuffer();

      await sendMessageWTyping(from, {
        image: imageBuffer,
        caption: `✅ Image blurred (level: ${blurLevel})`,
      }, { quoted: msg });
    } catch (error) {
      console.error("Blur error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to blur image. Please try again.",
      }, { quoted: msg });
    }
  },
});