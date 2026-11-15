export default () => ({
  cmd: ["tictactoe", "ttt"],
  desc: "Play TicTacToe in a group. (Needs lib/tictactoe)",
  usage: "tictactoe [room name] | <1-9> | surrender",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "TicTacToe only works in groups." }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ TicTacToe game engine needs lib/tictactoe module. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
