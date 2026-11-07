export default () => ({
  cmd: ["resetlink"],
  desc: "Reset the group invite link. Generates a new chat.whatsapp.com link.",
  usage: "resetlink",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner, groupMetadata } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "This command only works in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "❌ Only admins can use this command!" }, { quoted: msg });
    }

    try {
      const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
      const isBotAdmin = groupMetadata?.participants
        ?.filter((p) => p.admin)
        ?.map((p) => p.id)
        ?.includes(botId);

      if (!isBotAdmin) {
        return sendMessageWTyping(from, { text: "❌ Bot must be admin to reset group link!" }, { quoted: msg });
      }

      const newCode = await sock.groupRevokeInvite(from);

      return sendMessageWTyping(from, {
        text: `✅ Group link has been successfully reset\n\n📌 New link:\nhttps://chat.whatsapp.com/${newCode}`,
      }, { quoted: msg });
    } catch (error) {
      console.error("Error in resetlink command:", error);
      return sendMessageWTyping(from, { text: "Failed to reset group link!" }, { quoted: msg });
    }
  },
});
