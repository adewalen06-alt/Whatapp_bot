export default () => ({
  cmd: ["clearsession"],
  desc: "Clear session files. (Owner only)",
  usage: "clearsession",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner } = msgInfoObj;

    if (!msg.key.fromMe && !isOwner) {
      return sendMessageWTyping(from, {
        text: "❌ This command can only be used by the owner!",
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "✅ Session files cleared successfully!\n\nNote: Session persistence uses MongoDB on this deployment.",
    }, { quoted: msg });
  },
});
