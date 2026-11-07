export default () => ({
  cmd: ["groupinfo"],
  desc: "Show group information.",
  usage: "groupinfo",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, groupMetadata } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "Failed to get group info!" }, { quoted: msg });
    }

    try {
      const participants = groupMetadata?.participants || [];
      const groupAdmins = participants.filter((p) => p.admin);
      const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split("@")[0]}`).join("\n");

      const owner =
        groupMetadata.owner ||
        groupAdmins.find((p) => p.admin === "superadmin")?.id ||
        from.split("-")[0] + "@s.whatsapp.net";

      const text = `┌──「 *INFO GROUP* 」
▢ *♻️ID:*
   • ${groupMetadata.id}
▢ *🔖NAME* :
• ${groupMetadata.subject}
▢ *👥Members* :
• ${participants.length}
▢ *🤿Group Owner:*
• @${owner.split("@")[0]}
▢ *🕵🏻‍♂️Admins:*
${listAdmin}

▢ *📌Description* :
   • ${groupMetadata.desc?.toString() || "No description"}`.trim();

      return sock.sendMessage(from, {
        image: { url: "https://i.imgur.com/2wzGhpF.jpeg" },
        caption: text,
        mentions: [...groupAdmins.map((v) => v.id), owner],
      });
    } catch (error) {
      console.error("Error in groupinfo command:", error);
      return sendMessageWTyping(from, { text: "Failed to get group info!" }, { quoted: msg });
    }
  },
});
