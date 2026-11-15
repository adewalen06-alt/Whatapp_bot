export default () => ({
  cmd: ["gif"],
  desc: "Search for a GIF. (Needs Giphy API key)",
  usage: "gif <search term>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const query = (args.join(" ") || "").trim();

    if (!query) {
      return sendMessageWTyping(from, { text: "Please provide a search term for the GIF." }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ GIF search needs a Giphy API key. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
