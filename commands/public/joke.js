export default () => ({
  cmd: ["joke"],
  desc: "Get a random dad joke.",
  usage: "joke",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    try {
      const response = await fetch("https://icanhazdadjoke.com/", {
        headers: { Accept: "application/json" },
      });
      const jokeData = await response.json();
      const joke = jokeData.joke;

      return sendMessageWTyping(from, { text: joke }, { quoted: msg });
    } catch (error) {
      console.error("Error fetching joke:", error);
      return sendMessageWTyping(from, { text: "Sorry, I could not fetch a joke right now." }, { quoted: msg });
    }
  },
});
