export default () => ({
  cmd: ["goodnight"],
  desc: "Get a random goodnight message.",
  usage: "goodnight",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    try {
      const res = await fetch("https://shizoapi.onrender.com/api/texts/lovenight?apikey=shizo");

      if (!res.ok) {
        throw await res.text();
      }

      const json = await res.json();
      const goodnightMessage = json.result;

      return sendMessageWTyping(from, { text: goodnightMessage }, { quoted: msg });
    } catch (error) {
      console.error("Error in goodnight command:", error);
      return sendMessageWTyping(from, { text: "❌ Failed to get goodnight message. Please try again later!" }, { quoted: msg });
    }
  },
});
