export default () => ({
  cmd: ["imagine", "imagegen"],
  desc: "Generate an AI image from a prompt. (Needs API configuration)",
  usage: "imagine <prompt>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const prompt = (args.join(" ") || "").trim();

    if (!prompt) {
      return sendMessageWTyping(from, {
        text: "Please provide a prompt for the image generation.\nExample: .imagine a beautiful sunset over mountains",
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ AI image generation needs API configuration. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
