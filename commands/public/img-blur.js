export default () => ({
  cmd: ["blur", "img-blur"],
  desc: "Blur an image. Reply to an image or send one with caption. (Needs sharp library)",
  usage: "blur | reply to image",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    return sendMessageWTyping(from, {
      text: "❌ Image blur needs the 'sharp' library. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
