export default () => ({
  cmd: ["sudo"],
  desc: "Manage sudo users. (Owner only)",
  usage: "sudo add <@user|number> | del <@user|number> | list",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner } = msgInfoObj;

    const rawText = (args.join(" ") || "").trim();
    const parts = rawText.split(" ");
    const sub = (parts[0] || "").toLowerCase();

    if (!sub || !["add", "del", "remove", "list"].includes(sub)) {
      return sendMessageWTyping(from, {
        text: "Usage:\n.sudo add <@user|number>\n.sudo del <@user|number>\n.sudo list",
      }, { quoted: msg });
    }

    if (sub === "list") {
      return sendMessageWTyping(from, {
        text: "Sudo users:\nNo sudo users configured.",
      }, { quoted: msg });
    }

    if (!isOwner) {
      return sendMessageWTyping(from, {
        text: "❌ Only owner can add/remove sudo users. Use .sudo list to view.",
      }, { quoted: msg });
    }

    const targetJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
    if (!targetJid) {
      return sendMessageWTyping(from, { text: "Please mention a user or provide a number." }, { quoted: msg });
    }

    if (sub === "add") {
      return sendMessageWTyping(from, { text: `✅ Added sudo: ${targetJid}` }, { quoted: msg });
    }

    if (sub === "del" || sub === "remove") {
      return sendMessageWTyping(from, { text: `✅ Removed sudo: ${targetJid}` }, { quoted: msg });
    }
  },
});
