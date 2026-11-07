export default () => ({
  cmd: ["unban"],
  desc: "Unban a user from the bot. Mention them or reply to their message.",
  usage: "unban @user | reply",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner, extendedMessageOriginal } = msgInfoObj;

    if (isGroup && !isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "Only group admins can use .unban" }, { quoted: msg });
    }

    let userToUnban;
    if (extendedMessageOriginal) {
      userToUnban =
        extendedMessageOriginal.participant ||
        extendedMessageOriginal.mentionedJid?.[0];
    }

    if (!userToUnban) {
      return sendMessageWTyping(from, { text: "Please mention the user or reply to their message to unban!" }, { quoted: msg });
    }

    try {
      let bannedUsers = [];
      try {
        const fs = await import("fs");
        bannedUsers = JSON.parse(fs.readFileSync("./data/banned.json"));
      } catch {}

      const index = bannedUsers.indexOf(userToUnban);
      if (index > -1) {
        bannedUsers.splice(index, 1);
        try {
          const fs = await import("fs");
          fs.writeFileSync("./data/banned.json", JSON.stringify(bannedUsers, null, 2));
        } catch {}
        return sendMessageWTyping(from, {
          text: `Successfully unbanned ${userToUnban.split("@")[0]}!`,
          mentions: [userToUnban],
        }, { quoted: msg });
      } else {
        return sendMessageWTyping(from, {
          text: `${userToUnban.split("@")[0]} is not banned!`,
          mentions: [userToUnban],
        }, { quoted: msg });
      }
    } catch (error) {
      console.error("Error in unban command:", error);
      return sendMessageWTyping(from, { text: "Failed to unban user!" }, { quoted: msg });
    }
  },
});
