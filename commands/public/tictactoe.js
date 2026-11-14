import TicTacToe from "../../lib/tictactoe.js";

const games = new Map();

export default () => ({
  cmd: ["tictactoe", "ttt"],
  desc: "Play TicTacToe in a group",
  usage: "tictactoe [room name] | <1-9> | surrender",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, senderJid } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "TicTacToe only works in groups." }, { quoted: msg });
    }

    const room = args[0] || "default";
    const gameKey = `${from}-${room}`;
    let game = games.get(gameKey);

    if (!game) {
      game = {
        instance: new TicTacToe("X", "O"),
        players: [senderJid],
        currentPlayer: senderJid,
        status: "waiting",
      };
      games.set(gameKey, game);
      return sendMessageWTyping(from, {
        text: `🎮 TicTacToe room "${room}" created!\nWaiting for opponent... Type .ttt ${room} to join.`,
      }, { quoted: msg });
    }

    if (game.status === "waiting" && !game.players.includes(senderJid)) {
      game.players.push(senderJid);
      game.currentPlayer = game.players[0];
      game.status = "playing";
      return sendMessageWTyping(from, {
        text: `🎮 Game started!\n${game.players[0]} (X) vs ${game.players[1]} (O)\n\n${renderBoard(game.instance)}\n\n${game.currentPlayer}'s turn. Type .ttt <1-9> to move.`,
      }, { quoted: msg });
    }

    if (!game.players.includes(senderJid)) {
      return sendMessageWTyping(from, { text: "You are not in this game." }, { quoted: msg });
    }

    if (game.status !== "playing") {
      return sendMessageWTyping(from, { text: "Game is not active." }, { quoted: msg });
    }

    if (senderJid !== game.currentPlayer) {
      return sendMessageWTyping(from, { text: "Not your turn!" }, { quoted: msg });
    }

    if (args[0]?.toLowerCase() === "surrender") {
      const winner = game.players.find(p => p !== senderJid);
      games.delete(gameKey);
      return sendMessageWTyping(from, {
        text: `🏳️ ${senderJid.split("@")[0]} surrendered! ${winner.split("@")[0]} wins!`,
      }, { quoted: msg });
    }

    const pos = parseInt(args[0]) - 1;
    if (isNaN(pos) || pos < 0 || pos > 8) {
      return sendMessageWTyping(from, { text: "Invalid position. Use 1-9." }, { quoted: msg });
    }

    const result = game.instance.turn(game.currentPlayer, pos);
    if (result === -1) {
      return sendMessageWTyping(from, { text: "Invalid move. Try again." }, { quoted: msg });
    }

    const winner = game.instance.winner;
    if (winner) {
      games.delete(gameKey);
      return sendMessageWTyping(from, {
        text: `🎉 ${winner} wins!\n\n${renderBoard(game.instance)}`,
      }, { quoted: msg });
    }

    if (game.instance.turns >= 9) {
      games.delete(gameKey);
      return sendMessageWTyping(from, {
        text: `🤝 It's a draw!\n\n${renderBoard(game.instance)}`,
      }, { quoted: msg });
    }

    game.currentPlayer = game.players.find(p => p !== senderJid);
    return sendMessageWTyping(from, {
      text: `${renderBoard(game.instance)}\n\n${game.currentPlayer}'s turn.`,
    }, { quoted: msg });
  },
});

function renderBoard(game) {
  const board = game.render();
  return `┌─┬─┬─┐\n│ ${board[0]} │ ${board[1]} │ ${board[2]} │\n├─┼─┼─┤\n│ ${board[3]} │ ${board[4]} │ ${board[5]} │\n├─┼─┼─┤\n│ ${board[6]} │ ${board[7]} │ ${board[8]} │\n└─┴─┴─┘`;
}