export default () => ({
  cmd: ["setpp"],
  desc: "Set bot profile picture from a replied image. (Owner only)",
  usage: "setpp (reply to image)",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner } = msgInfoObj;

    if (!msg.key.fromMe && !isOwner) {
      return sendMessageWTyping(from, { text: "❌ This command is only available for the owner!" }, { quoted: msg });
    }

    const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMessage) {
      return sendMessageWTyping(from, { text: "⚠️ Please reply to an image with the .setpp command!" }, { quoted: msg });
    }

    const imageMessage = quotedMessage.imageMessage || quotedMessage.stickerMessage;
    if (!imageMessage) {
      return sendMessageWTyping(from, { text: "❌ The replied message must contain an image!" }, { quoted: msg });
    }

    return sendMessageWTyping(from, { text: "❌ Profile picture update needs file system access. Please contact the bot owner." }, { quoted: msg });
  },
});
