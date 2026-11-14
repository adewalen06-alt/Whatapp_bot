import { downloadMediaMessage } from "baileys";

export default () => ({
  cmd: ["vv2"],
  desc: "Resend a view-once message to your DM. Reply to a view-once image/video/audio.",
  usage: "vv2 | reply to view-once",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal, senderJid } = msgInfoObj;

    if (!extendedMessageOriginal?.quotedMessage) {
      return sendMessageWTyping(from, {
        text: "🗑️ Reply to a *view-once* message with `.vv2`.",
      }, { quoted: msg });
    }

    try {
      const quotedMsg = extendedMessageOriginal.quotedMessage;
      const viewOnce = quotedMsg.viewOnceMessage?.message || quotedMsg.viewOnceMessageV2?.message;
      
      if (!viewOnce) {
        return sendMessageWTyping(from, {
          text: "❌ This is not a view-once message.",
        }, { quoted: msg });
      }

      const mediaType = Object.keys(viewOnce)[0];
      const mediaMsg = viewOnce[mediaType];
      
      if (!mediaMsg) {
        return sendMessageWTyping(from, {
          text: "❌ Could not extract media from view-once message.",
        }, { quoted: msg });
      }

      const buffer = await downloadMediaMessage(
        { message: quotedMsg },
        "buffer",
        {},
        { logger: console }
      );

      // Send to DM
      const dmJid = senderJid;
      if (mediaType === "imageMessage") {
        await sock.sendMessage(dmJid, { image: buffer, caption: mediaMsg.caption || "" });
      } else if (mediaType === "videoMessage") {
        await sock.sendMessage(dmJid, { video: buffer, caption: mediaMsg.caption || "", mimetype: "video/mp4" });
      } else if (mediaType === "audioMessage") {
        await sock.sendMessage(dmJid, { audio: buffer, mimetype: "audio/mpeg" });
      } else {
        return sendMessageWTyping(from, {
          text: "❌ Unsupported media type in view-once message.",
        }, { quoted: msg });
      }

      await sendMessageWTyping(from, {
        text: "✅ View-once media sent to your DM!",
      }, { quoted: msg });
    } catch (error) {
      console.error("ViewOnce2 error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to extract view-once media. Please try again.",
      }, { quoted: msg });
    }
  },
});