export default () => ({
  cmd: ["kick"],
  desc: "Kick a member from the group. Mention them or reply to their message.",
  usage: "kick @user | reply",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner, extendedMessageOriginal } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "This command only works in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "Only group admins can use the kick command." }, { quoted: msg });
    }

    let usersToKick = [];
    if (extendedMessageOriginal) {
      if (extendedMessageOriginal.mentionedJid?.length > 0) {
        usersToKick = extendedMessageOriginal.mentionedJid;
      } else if (extendedMessageOriginal.participant) {
        usersToKick = [extendedMessageOriginal.participant];
      }
    }

    if (usersToKick.length === 0) {
      return sendMessageWTyping(from, {
        text: "Please mention the user or reply to their message to kick!",
      }, { quoted: msg });
    }

    try {
      const botId = sock.user?.id || "";
      const botPhoneNumber = botId.includes(":") ? botId.split(":")[0] : botId;
      const botIdFormatted = botPhoneNumber + "@s.whatsapp.net";

      const isTryingToKickBot = usersToKick.some((userId) => {
        const userPhoneNumber = userId.includes(":") ? userId.split(":")[0] : userId;
        return (
          userId === botId ||
          userId === botIdFormatted ||
          userPhoneNumber === botPhoneNumber
        );
      });

      if (isTryingToKickBot) {
        return sendMessageWTyping(from, { text: "I can't kick myself🤖" }, { quoted: msg });
      }

      await sock.groupParticipantsUpdate(from, usersToKick, "remove");

      const usernames = usersToKick.map((jid) => `@${jid.split("@")[0]}`);
      return sendMessageWTyping(from, {
        text: `${usernames.join(", ")} has been kicked successfully!`,
        mentions: usersToKick,
      });
    } catch (error) {
      console.error("Error in kick command:", error);
      return sendMessageWTyping(from, { text: "Failed to kick user(s)!" }, { quoted: msg });
    }
  },
});
