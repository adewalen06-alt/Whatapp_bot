export default () => ({
  cmd: ["goodbye"],
  desc: "Configure goodbye messages in the group. (Admins only)",
  usage: "goodbye on | off | set <message>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "This command can only be used in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "Only group admins can use this command." }, { quoted: msg });
    }

    const sub = (args[0] || "").toLowerCase();

    if (!sub) {
      return sendMessageWTyping(from, {
        text: "Usage: .goodbye on | off | set <message>",
      }, { quoted: msg });
    }

    if (sub === "on") {
      return sendMessageWTyping(from, { text: "✅ Goodbye messages enabled." }, { quoted: msg });
    } else if (sub === "off") {
      return sendMessageWTyping(from, { text: "✅ Goodbye messages disabled." }, { quoted: msg });
    } else if (sub === "set") {
      const message = args.slice(1).join(" ");
      if (!message) {
        return sendMessageWTyping(from, { text: "Usage: .goodbye set <message>" }, { quoted: msg });
      }
      return sendMessageWTyping(from, { text: `✅ Goodbye message set to: ${message}` }, { quoted: msg });
    }

    return sendMessageWTyping(from, { text: "Usage: .goodbye on | off | set <message>" }, { quoted: msg });
  },
});
