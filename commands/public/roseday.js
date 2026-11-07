export default () => ({
  cmd: ["roseday"],
  desc: "Get a random Rose Day quote. (Needs external API)",
  usage: "roseday",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    try {
      const res = await fetch("https://api.princetechn.com/api/fun/roseday?apikey=prince");

      if (!res.ok) {
        throw await res.text();
      }

      const json = await res.json();
      const rosedayMessage = json.result;

      return sendMessageWTyping(from, { text: rosedayMessage }, { quoted: msg });
    } catch (error) {
      console.error("Error in roseday command:", error);
      return sendMessageWTyping(from, { text: "❌ Failed to get roseday quote. Please try again later!" }, { quoted: msg });
    }
  },
});
