export default () => ({
  cmd: ["autotyping"],
  desc: "Toggle auto-typing indicator. (Owner only)",
  usage: "autotyping on | off",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner } = msgInfoObj;

    if (!msg.key.fromMe && !isOwner) {
      return sendMessageWTyping(from, {
        text: "❌ This command is only available for the owner!",
      }, { quoted: msg });
    }

    const action = (args[0] || "").toLowerCase();
    if (!action || !["on", "off", "enable", "disable"].includes(action)) {
      return sendMessageWTyping(from, {
        text: "Usage: .autotyping on|off",
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: `✅ Auto-typing has been ${action === "on" || action === "enable" ? "enabled" : "disabled"}!`,
    }, { quoted: msg });
  },
});
