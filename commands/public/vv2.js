export default () => ({
  cmd: ["vv2"],
  desc: "Resend a view-once message to your DM. Reply to a view-once image/video/audio.",
  usage: "vv2 | reply to view-once",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    return sendMessageWTyping(from, {
      text: "🗑️ Reply to a *view-once* message. It will be sent to your DM.\n(Needs baileys media download)",
    }, { quoted: msg });
  },
});
