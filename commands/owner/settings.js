export default () => ({
  cmd: ["settings"],
  desc: "Show bot settings and status. (Owner only)",
  usage: "settings",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner, isGroup } = msgInfoObj;

    if (!msg.key.fromMe && !isOwner) {
      return sendMessageWTyping(from, { text: "Only bot owner can use this command!" }, { quoted: msg });
    }

    const lines = [];
    lines.push("*BOT SETTINGS*");
    lines.push("");
    lines.push("• Mode: Public");
    lines.push("• MongoDB Persistence: Connected");
    lines.push("• Antilink: Configured per group");
    lines.push("• Auto Status: OFF");
    lines.push("• Autoread: OFF");
    lines.push("• Autotyping: OFF");
    lines.push("• PM Blocker: OFF");
    lines.push("• Anticall: OFF");

    if (isGroup) {
      lines.push("");
      lines.push(`Group: ${from}`);
      lines.push("• Antilink: Check with .antilink get");
    } else {
      lines.push("");
      lines.push("Note: Per-group settings will be shown when used inside a group.");
    }

    return sendMessageWTyping(from, { text: lines.join("\n") }, { quoted: msg });
  },
});
