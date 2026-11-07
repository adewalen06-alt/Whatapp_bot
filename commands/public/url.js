export default () => ({
  cmd: ["url"],
  desc: "Upload media and get a URL. (Needs uploader library)",
  usage: "url | reply to media",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    return sendMessageWTyping(from, {
      text: "❌ Media URL upload needs uploader library. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
