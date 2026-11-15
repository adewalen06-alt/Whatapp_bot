export default () => ({
  cmd: ["sticker-alt"],
  desc: "Convert replied image/video to sticker. (Needs ffmpeg)",
  usage: "sticker-alt (reply to image/video)",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    return sendMessageWTyping(from, {
      text: "❌ Sticker conversion needs ffmpeg. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
