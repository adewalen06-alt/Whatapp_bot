export default () => ({
  cmd: ["flirt"],
  desc: "Get a random flirt message.",
  usage: "flirt",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    try {
      const res = await fetch("https://shizoapi.onrender.com/api/texts/flirt?apikey=shizo");

      if (!res.ok) {
        throw await res.text();
      }

      const json = await res.json();
      const flirtMessage = json.result;

      return sendMessageWTyping(from, { text: flirtMessage }, { quoted: msg });
    } catch (error) {
      console.error("Error in flirt command:", error);
      return sendMessageWTyping(from, { text: "❌ Failed to get flirt message. Please try again later!" }, { quoted: msg });
    }
  },
});
