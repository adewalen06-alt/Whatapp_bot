export default () => ({
  cmd: ["simage"],
  desc: "Convert a replied sticker to image. (Needs sharp library)",
  usage: "simage (reply to sticker)",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    return sendMessageWTyping(from, {
      text: "❌ Sticker-to-image conversion needs the 'sharp' library. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
