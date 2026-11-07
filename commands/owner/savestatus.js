export default () => ({
  cmd: ["savestatus"],
  desc: "Save a status by replying to it. (Owner only)",
  usage: "savestatus | on | off",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner } = msgInfoObj;

    if (!msg.key.fromMe && !isOwner) {
      return sendMessageWTyping(from, { text: "❌ This command can only be used by the owner!" }, { quoted: msg });
    }

    const text = (args.join(" ") || "").trim().split(/\s+/);
    const sub = (text[0] || "").toLowerCase();

    if (["on", "off", "enable", "disable"].includes(sub)) {
      const enable = sub === "on" || sub === "enable";
      return sendMessageWTyping(from, {
        text: enable ? "💾 *Auto-save ON* (safe mode)." : "💾 *Auto-save OFF.*",
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "💾 *Save status*\n\nReply to a status → `.savestatus`\n`.savestatus on` — enable auto-save\n`.savestatus off` — disable auto-save",
    }, { quoted: msg });
  },
});
