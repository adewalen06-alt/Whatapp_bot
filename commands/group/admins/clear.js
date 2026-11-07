export default () => ({
  cmd: ["clear"],
  desc: "Clear/delete the bot's last message in the chat.",
  usage: "clear",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    try {
      const message = await sock.sendMessage(from, { text: "Clearing bot messages..." });
      const messageKey = message.key;
      await sock.sendMessage(from, { delete: messageKey });
    } catch (error) {
      console.error("Error clearing messages:", error);
      return sendMessageWTyping(from, { text: "An error occurred while clearing messages." }, { quoted: msg });
    }
  },
});
