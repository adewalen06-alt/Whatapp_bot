export default () => ({
  cmd: ["8ball", "eightball"],
  desc: "Ask the magic 8-ball a yes/no question.",
  usage: "8ball <question>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const eightBallResponses = [
      "Yes, definitely!",
      "No way!",
      "Ask again later.",
      "It is certain.",
      "Very doubtful.",
      "Without a doubt.",
      "My reply is no.",
      "Signs point to yes.",
    ];

    const question = args.join(" ");
    if (!question) {
      return sendMessageWTyping(from, { text: "Please ask a question!" }, { quoted: msg });
    }

    const randomResponse =
      eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
    return sendMessageWTyping(from, { text: `🎱 ${randomResponse}` }, { quoted: msg });
  },
});
