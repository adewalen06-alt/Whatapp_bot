export default () => ({
  cmd: ["trivia"],
  desc: "Start a trivia quiz game. (Needs external API)",
  usage: "trivia | <answer>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const answer = (args.join(" ") || "").trim();

    global.triviaGames = global.triviaGames || {};

    if (!answer) {
      if (global.triviaGames[from]) {
        return sendMessageWTyping(from, { text: "A trivia game is already in progress!" }, { quoted: msg });
      }

      try {
        const response = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
        const data = await response.json();
        const questionData = data.results[0];

        global.triviaGames[from] = {
          question: questionData.question,
          correctAnswer: questionData.correct_answer,
          options: [...questionData.incorrect_answers, questionData.correct_answer].sort(),
        };

        return sendMessageWTyping(from, {
          text: `Trivia Time!\n\nQuestion: ${global.triviaGames[from].question}\nOptions:\n${global.triviaGames[from].options.join("\n")}`,
        }, { quoted: msg });
      } catch (error) {
        console.error("Error fetching trivia question:", error);
        return sendMessageWTyping(from, { text: "Error fetching trivia question. Try again later." }, { quoted: msg });
      }
    }

    if (!global.triviaGames[from]) {
      return sendMessageWTyping(from, { text: "No trivia game is in progress." }, { quoted: msg });
    }

    const game = global.triviaGames[from];

    if (answer.toLowerCase() === game.correctAnswer.toLowerCase()) {
      delete global.triviaGames[from];
      return sendMessageWTyping(from, { text: `Correct! The answer is ${game.correctAnswer}` }, { quoted: msg });
    } else {
      delete global.triviaGames[from];
      return sendMessageWTyping(from, { text: `Wrong! The correct answer was ${game.correctAnswer}` }, { quoted: msg });
    }
  },
});
