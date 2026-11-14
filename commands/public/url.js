import { downloadMediaMessage } from "baileys";
import { TelegraPh } from "../../lib/uploader.js";

export default () => ({
  cmd: ["url"],
  desc: "Upload media and get a URL",
  usage: "url | reply to media",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal } = msgInfoObj;

    if (!extendedMessageOriginal?.quotedMessage) {
      return sendMessageWTyping(from, {
        text: "❌ Reply to media (image, video, audio, or document) to upload.",
      }, { quoted: msg });
    }

    try {
      const quotedMsg = extendedMessageOriginal.quotedMessage;
      const mediaType = Object.keys(quotedMsg)[0];
      
      if (!["imageMessage", "videoMessage", "audioMessage", "documentMessage"].includes(mediaType)) {
        return sendMessageWTyping(from, {
          text: "❌ Reply to media (image, video, audio, or document) to upload.",
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

      const url = await TelegraPh(buffer);
      await sendMessageWTyping(from, {
        text: `✅ Uploaded to Telegram!\n\n🔗 ${url}`,
      }, { quoted: msg });
    } catch (error) {
      console.error("URL upload error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to upload media. Please try again.",
      }, { quoted: msg });
    }
  },
});