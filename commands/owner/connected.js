export default () => ({
  cmd: ["connected"],
  desc: "Manage connected numbers. (Owner only)",
  usage: "connected add <number> [name] | remove <number> | list",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner } = msgInfoObj;

    if (!msg.key.fromMe && !isOwner) {
      return sendMessageWTyping(from, {
        text: "❌ This command is only available for the owner!",
      }, { quoted: msg });
    }

    const action = (args[0] || "").toLowerCase();

    if (action === "list") {
      return sendMessageWTyping(from, {
        text: "📋 *Connected Numbers*\n\nNo connected numbers configured.\nUse .connected add <number> [name] to add one.",
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "Usage: .connected add <number> [name] | remove <number> | list",
    }, { quoted: msg });
  },
});
