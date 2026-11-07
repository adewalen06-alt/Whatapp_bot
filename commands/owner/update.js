export default () => ({
  cmd: ["update"],
  desc: "Update the bot from GitHub. (Owner only)",
  usage: "update",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner } = msgInfoObj;

    if (!msg.key.fromMe && !isOwner) {
      return sendMessageWTyping(from, { text: "Only bot owner or sudo can use .update" }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "🔄 Use `git pull` on the server to update, then restart the Render service.",
    }, { quoted: msg });
  },
});
