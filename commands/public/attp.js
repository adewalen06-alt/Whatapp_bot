export default () => ({
  cmd: ["attp"],
  desc: "Create an animated text sticker. (Requires ffmpeg)",
  usage: "attp <text>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const text = (args.join(" ") || "").trim();

    if (!text) {
      return sendMessageWTyping(from, { text: "Please provide text after the .attp command." }, { quoted: msg });
    }

    return sendMessageWTyping(from, { text: "Attp sticker generation requires ffmpeg and exif tools which are not available in this build." }, { quoted: msg });
  },
});
