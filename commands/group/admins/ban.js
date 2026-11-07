export default () => ({
  cmd: ["ban"],
  desc: "Ban a user from the bot. Mention them or reply to their message.",
  usage: "ban @user | reply",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, groupMetadata, senderJid, isGroupAdmin, isOwner, extendedMessageOriginal } = msgInfoObj;

    if (isGroup && !isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "Only group admins can use .ban" }, { quoted: msg });
    }

    let userToBan;
    if (extendedMessageOriginal) {
      userToBan =
        extendedMessageOriginal.participant ||
        extendedMessageOriginal.mentionedJid?.[0];
    }

    if (!userToBan) {
      return sendMessageWTyping(from, { text: "Please mention the user or reply to their message to ban!" }, { quoted: msg });
    }

    try {
      const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
      if (userToBan === botId || userToBan === botId.replace("@s.whatsapp.net", "@lid")) {
        return sendMessageWTyping(from, { text: "You cannot ban the bot account." }, { quoted: msg });
      }
    } catch {}

    try {
      let bannedUsers = [];
      try {
        const fs = await import("fs");
        bannedUsers = JSON.parse(fs.readFileSync("./data/banned.json"));
      } catch {}

      if (!bannedUsers.includes(userToBan)) {
        bannedUsers.push(userToBan);
        try {
          const fs = await import("fs");
          fs.writeFileSync("./data/banned.json", JSON.stringify(bannedUsers, null, 2));
        } catch {}
        return sendMessageWTyping(from, {
          text: `Successfully banned @${userToBan.split("@")[0]}!`,
          mentions: [userToBan],
        }, { quoted: msg });
      } else {
        return sendMessageWTyping(from, {
          text: `${userToBan.split("@")[0]} is already banned!`,
          mentions: [userToBan],
        }, { quoted: msg });
      }
    } catch (error) {
      console.error("Error in ban command:", error);
      return sendMessageWTyping(from, { text: "Failed to ban user!" }, { quoted: msg });
    }
  },
});
