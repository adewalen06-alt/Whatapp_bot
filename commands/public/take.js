import { downloadMediaMessage } from "baileys";
import WSF from "wa-sticker-formatter";

export default () => ({
  cmd: ["take"],
  desc: "Take a sticker and repackage it with a custom pack name",
  usage: "take <packname> (reply to sticker)",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal } = msgInfoObj;
    const packname = args.join(" ") || "Topai Bot";

    if (!extendedMessageOriginal?.quotedMessage) {
      return sendMessageWTyping(from, {
        text: "❌ Reply to a sticker to repackage it.",
      }, { quoted: msg });
    }

    try {
      const quotedMsg = extendedMessageOriginal.quotedMessage;
      const mediaType = Object.keys(quotedMsg)[0];
      
      if (mediaType !== "stickerMessage") {
        return sendMessageWTyping(from, {
          text: "❌ Reply to a sticker to repackage it.",
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

      const webpWithMetadata = await WSF.setMetadata(packname, "jacktheboss220", buffer);
      await sendMessageWTyping(from, { sticker: Buffer.from(webpWithMetadata) }, { quoted: msg });
    } catch (error) {
      console.error("Take error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to repackage sticker. Please try again.",
      }, { quoted: msg });
    }
  },
});