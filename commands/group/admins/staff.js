export default () => ({
  cmd: ["staff", "admins"],
  desc: "List group admins.",
  usage: "staff",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, groupMetadata } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "Failed to get admin list!" }, { quoted: msg });
    }

    try {
      const participants = groupMetadata?.participants || [];
      const groupAdmins = participants.filter((p) => p.admin);
      const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split("@")[0]}`).join("\n▢ ");

      const owner = groupMetadata.owner || groupAdmins.find((p) => p.admin === "superadmin")?.id || from.split("-")[0] + "@s.whatsapp.net";

      const text = `≡ *GROUP ADMINS* _${groupMetadata.subject}_

┌─⊷ *ADMINS*
▢ ${listAdmin}
└───────────`.trim();

      return sock.sendMessage(from, {
        image: { url: "https://i.imgur.com/2wzGhpF.jpeg" },
        caption: text,
        mentions: [...groupAdmins.map((v) => v.id), owner],
      });
    } catch (error) {
      console.error("Error in staff command:", error);
      return sendMessageWTyping(from, { text: "Failed to get admin list!" }, { quoted: msg });
    }
  },
});
