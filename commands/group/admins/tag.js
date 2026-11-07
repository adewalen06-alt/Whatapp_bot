export default () => ({
  cmd: ["tag"],
  desc: "Tag all members in the group. Reply to a message to forward it with mentions.",
  usage: "tag <text> | reply",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner, extendedMessageOriginal, groupMetadata } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "This command only works in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "Only admins can use the .tag command." }, { quoted: msg });
    }

    const participants = groupMetadata?.participants || [];
    const mentionedJidList = participants.map((p) => p.id);

    const messageText = args.join(" ");
    const replyMessage = extendedMessageOriginal;

    if (replyMessage) {
      let messageContent = {};

      if (replyMessage.imageMessage) {
        messageContent = {
          image: { url: replyMessage.imageMessage.url || "" },
          caption: messageText || replyMessage.imageMessage.caption || "",
          mentions: mentionedJidList,
        };
      } else if (replyMessage.videoMessage) {
        messageContent = {
          video: { url: replyMessage.videoMessage.url || "" },
          caption: messageText || replyMessage.videoMessage.caption || "",
          mentions: mentionedJidList,
        };
      } else if (replyMessage.conversation || replyMessage.extendedTextMessage) {
        messageContent = {
          text: replyMessage.conversation || replyMessage.extendedTextMessage?.text || "",
          mentions: mentionedJidList,
        };
      } else if (replyMessage.documentMessage) {
        messageContent = {
          document: { url: replyMessage.documentMessage.url || "" },
          fileName: replyMessage.documentMessage.fileName || "",
          caption: messageText || "",
          mentions: mentionedJidList,
        };
      }

      if (Object.keys(messageContent).length > 0) {
        return sock.sendMessage(from, messageContent);
      }
    } else {
      return sendMessageWTyping(from, {
        text: messageText || "Tagged message",
        mentions: mentionedJidList,
      }, { quoted: msg });
    }
  },
});
