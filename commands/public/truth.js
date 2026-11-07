export default () => ({
  cmd: ["truth"],
  desc: "Get a random truth question. (Needs external API)",
  usage: "truth",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    try {
      const res = await fetch("https://shizoapi.onrender.com/api/texts/truth?apikey=shizo");

      if (!res.ok) {
        throw await res.text();
      }

      const json = await res.json();
      const truthMessage = json.result;

      return sendMessageWTyping(from, { text: truthMessage }, { quoted: msg });
    } catch (error) {
      console.error("Error in truth command:", error);
      return sendMessageWTyping(from, { text: "❌ Failed to get truth. Please try again later!" }, { quoted: msg });
    }
  },
});
