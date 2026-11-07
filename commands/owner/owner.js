export default () => ({
  cmd: ["owner"],
  desc: "Show bot owner contact card.",
  usage: "owner",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    return sendMessageWTyping(from, {
      text: "Bot Owner: Topai\nContact the owner through the admin dashboard.",
    }, { quoted: msg });
  },
});
