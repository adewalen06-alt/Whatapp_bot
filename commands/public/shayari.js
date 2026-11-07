export default () => ({
  cmd: ["shayari", "roseday"],
  desc: "Get a random shayari/poetry. (Needs external API)",
  usage: "shayari",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    try {
      const response = await fetch("https://shizoapi.onrender.com/api/texts/shayari?apikey=shizo");
      const data = await response.json();

      if (!data || !data.result) {
        throw new Error("Invalid response from API");
      }

      return sendMessageWTyping(from, {
        text: data.result,
      }, { quoted: msg });
    } catch (error) {
      console.error("Error in shayari command:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to fetch shayari. Please try again later.",
      }, { quoted: msg });
    }
  },
});
