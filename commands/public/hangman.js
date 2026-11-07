export default () => ({
  cmd: ["hangman"],
  desc: "Start a hangman word-guessing game in the chat.",
  usage: "hangman | guess <letter>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const words = ["javascript", "bot", "hangman", "whatsapp", "nodejs"];

    if (!args || args.length === 0) {
      const word = words[Math.floor(Math.random() * words.length)];
      const maskedWord = "_ ".repeat(word.length).trim();

      global.hangmanGames = global.hangmanGames || {};
      global.hangmanGames[from] = {
        word,
        maskedWord: maskedWord.split(" "),
        guessedLetters: [],
        wrongGuesses: 0,
        maxWrongGuesses: 6,
      };

      return sendMessageWTyping(from, { text: `Game started! The word is: ${maskedWord}` }, { quoted: msg });
    }

    const letter = args[0].toLowerCase();

    global.hangmanGames = global.hangmanGames || {};
    const game = global.hangmanGames[from];

    if (!game) {
      return sendMessageWTyping(from, { text: "No game in progress. Start a new game with .hangman" }, { quoted: msg });
    }

    const { word, guessedLetters, maskedWord, maxWrongGuesses } = game;

    if (guessedLetters.includes(letter)) {
      return sendMessageWTyping(from, { text: `You already guessed "${letter}". Try another letter.` }, { quoted: msg });
    }

    guessedLetters.push(letter);

    if (word.includes(letter)) {
      for (let i = 0; i < word.length; i++) {
        if (word[i] === letter) {
          maskedWord[i] = letter;
        }
      }

      if (!maskedWord.includes("_")) {
        delete global.hangmanGames[from];
        return sendMessageWTyping(from, { text: `Congratulations! You guessed the word: ${word}` }, { quoted: msg });
      }

      return sendMessageWTyping(from, { text: `Good guess! ${maskedWord.join(" ")}` }, { quoted: msg });
    } else {
      game.wrongGuesses += 1;

      if (game.wrongGuesses >= maxWrongGuesses) {
        delete global.hangmanGames[from];
        return sendMessageWTyping(from, { text: `Game over! The word was: ${word}` }, { quoted: msg });
      }

      return sendMessageWTyping(from, { text: `Wrong guess! You have ${maxWrongGuesses - game.wrongGuesses} tries left.` }, { quoted: msg });
    }
  },
});
