export default () => ({
  cmd: ["groupmanage"],
  desc: "Group management commands. (Admins only)",
  usage: "setgdesc <text> | setgname <name> | setgpp (reply to image)",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "This command can only be used in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "Only group admins can use this command." }, { quoted: msg });
    }

    const sub = (args[0] || "").toLowerCase();

    if (sub === "setgdesc") {
      const desc = args.slice(1).join(" ");
      if (!desc) {
        return sendMessageWTyping(from, { text: "Usage: .setgdesc <description>" }, { quoted: msg });
      }
      try {
        await sock.groupUpdateDescription(from, desc);
        return sendMessageWTyping(from, { text: "✅ Group description updated." }, { quoted: msg });
      } catch (e) {
        return sendMessageWTyping(from, { text: "❌ Failed to update group description." }, { quoted: msg });
      }
    } else if (sub === "setgname") {
      const name = args.slice(1).join(" ");
      if (!name) {
        return sendMessageWTyping(from, { text: "Usage: .setgname <new name>" }, { quoted: msg });
      }
      try {
        await sock.groupUpdateSubject(from, name);
        return sendMessageWTyping(from, { text: "✅ Group name updated." }, { quoted: msg });
      } catch (e) {
        return sendMessageWTyping(from, { text: "❌ Failed to update group name." }, { quoted: msg });
      }
    } else if (sub === "setgpp") {
      return sendMessageWTyping(from, { text: "❌ Group photo update needs file system access." }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "Usage: .groupmanage setgdesc <text> | setgname <name> | setgpp (reply to image)",
    }, { quoted: msg });
  },
});
