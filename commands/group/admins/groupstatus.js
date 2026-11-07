export default () => ({
  cmd: ["groupstatus", "togstatus", "swgc", "gstatus", "gs"],
  desc: "Post group status (text/image/video/audio). (Admins only)",
  usage: "groupstatus <text> | reply to media",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "👥 This command can only be used in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "❌ Only group admins can use this command." }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ Group status posting needs baileys media upload. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
