export default () => ({
  cmd: ["dare"],
  desc: "Get a random dare challenge.",
  usage: "dare",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    try {
      const res = await fetch("https://shizoapi.onrender.com/api/texts/dare?apikey=shizo");

      if (!res.ok) {
        throw await res.text();
      }

      const json = await res.json();
      const dareMessage = json.result;

      return sendMessageWTyping(from, { text: dareMessage }, { quoted: msg });
    } catch (error) {
      console.error("Error in dare command:", error);
      return sendMessageWTyping(from, { text: "❌ Failed to get dare. Please try again later!" }, { quoted: msg });
    }
  },
});
