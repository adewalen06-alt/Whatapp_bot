import { downloadMediaMessage } from "baileys";

export default () => ({
  cmd: ["vv", "viewonce"],
  desc: "Resend a view-once message. Reply to a view-once image/video/audio.",
  usage: "vv | vv set dm | normal",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal } = msgInfoObj;
    const sub = (args.join(" ") || "").trim();

    if (/^set\s+(dm|normal)$/i.test(sub)) {
      const mode = sub.split(" ")[1];
      return sendMessageWTyping(from, {
        text: `✅ .vv mode set to *${mode === "dm" ? "DM" : "Normal"}*.`,
      }, { quoted: msg });
    }

    if (!extendedMessageOriginal?.quotedMessage) {
      return sendMessageWTyping(from, {
        text: "🗑️ Reply to a *view-once* message with `.vv`.\nUse `.vv set dm` or `.vv set normal` to change the destination.",
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

      if (mediaType === "imageMessage") {
        await sock.sendMessage(from, { image: buffer, caption: mediaMsg.caption || "" }, { quoted: msg });
      } else if (mediaType === "videoMessage") {
        await sock.sendMessage(from, { video: buffer, caption: mediaMsg.caption || "", mimetype: "video/mp4" }, { quoted: msg });
      } else if (mediaType === "audioMessage") {
        await sock.sendMessage(from, { audio: buffer, mimetype: "audio/mpeg" }, { quoted: msg });
      } else {
        return sendMessageWTyping(from, {
          text: "❌ Unsupported media type in view-once message.",
        }, { quoted: msg });
      }
    } catch (error) {
      console.error("ViewOnce error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to extract view-once media. Please try again.",
      }, { quoted: msg });
    }
  },
});