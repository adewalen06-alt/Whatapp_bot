export default () => ({
  cmd: ["take"],
  desc: "Take a sticker and repackage it with a custom pack name. (Needs webpmux)",
  usage: "take <packname> (reply to sticker)",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const packname = args.join(" ") || "Topai Bot";

    return sendMessageWTyping(from, {
      text: "❌ Sticker repackaging needs node-webpmux. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
