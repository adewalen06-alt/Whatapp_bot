export default () => ({
  cmd: ["metallic", "ice", "snow", "impressive", "matrix", "light", "neon", "devil", "purple", "thunder", "leaves", "1917", "arena", "hacker", "sand", "blackpink", "glitch", "fire"],
  desc: "Generate stylized text images. (Needs mumaker API)",
  usage: "<type> <text>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const text = (args.join(" ") || "").trim();

    if (!text) {
      return sendMessageWTyping(from, {
        text: "Please provide text to generate\nExample: .metallic Nick",
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ Text generator needs mumaker API. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
