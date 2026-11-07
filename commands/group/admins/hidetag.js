export default () => ({
  cmd: ["hidetag"],
  desc: "Tag all non-admin members in the group. Reply to a message to forward it with mentions.",
  usage: "hidetag <text> | reply",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner, extendedMessageOriginal, groupMetadata } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "This command only works in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "Only admins can use the .hidetag command." }, { quoted: msg });
    }

    const participants = groupMetadata?.participants || [];
    const nonAdmins = participants.filter((p) => !p.admin).map((p) => p.id);

    const messageText = args.join(" ");
    const replyMessage = extendedMessageOriginal;

    if (replyMessage) {
      let content = {};
      if (replyMessage.imageMessage) {
        content = {
          image: { url: replyMessage.imageMessage.url || "" },
          caption: messageText || replyMessage.imageMessage.caption || "",
          mentions: nonAdmins,
        };
      } else if (replyMessage.videoMessage) {
        content = {
          video: { url: replyMessage.videoMessage.url || "" },
          caption: messageText || replyMessage.videoMessage.caption || "",
          mentions: nonAdmins,
        };
      } else if (replyMessage.conversation || replyMessage.extendedTextMessage) {
        content = {
          text: replyMessage.conversation || replyMessage.extendedTextMessage?.text || "",
          mentions: nonAdmins,
        };
      } else if (replyMessage.documentMessage) {
        content = {
          document: { url: replyMessage.documentMessage.url || "" },
          fileName: replyMessage.documentMessage.fileName || "",
          caption: messageText || "",
          mentions: nonAdmins,
        };
      }

      if (Object.keys(content).length > 0) {
        return sock.sendMessage(from, content);
      }
    } else {
      return sendMessageWTyping(from, {
        text: messageText || "Tagged members (excluding admins).",
        mentions: nonAdmins,
      }, { quoted: msg });
    }
  },
});
