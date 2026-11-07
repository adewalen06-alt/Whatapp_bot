export default () => ({
  cmd: ["character"],
  desc: "Analyze a mentioned or replied user's character. (Needs API)",
  usage: "character @user | reply",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal } = msgInfoObj;

    let userToAnalyze;
    if (extendedMessageOriginal) {
      userToAnalyze =
        extendedMessageOriginal.participant ||
        extendedMessageOriginal.mentionedJid?.[0];
    }

    if (!userToAnalyze) {
      return sendMessageWTyping(from, {
        text: "Please mention someone or reply to their message to analyze their character!",
      }, { quoted: msg });
    }

    try {
      let profilePic;
      try {
        profilePic = await sock.profilePictureUrl(userToAnalyze, "image");
      } catch {
        profilePic = "https://i.imgur.com/2wzGhpF.jpeg";
      }

      const traits = [
        "Intelligent", "Creative", "Determined", "Ambitious", "Caring",
        "Charismatic", "Confident", "Empathetic", "Energetic", "Friendly",
        "Generous", "Honest", "Humorous", "Imaginative", "Independent",
        "Intuitive", "Kind", "Logical", "Loyal", "Optimistic",
        "Passionate", "Patient", "Persistent", "Reliable", "Resourceful",
        "Sincere", "Thoughtful", "Understanding", "Versatile", "Wise",
      ];

      const numTraits = Math.floor(Math.random() * 3) + 3;
      const selectedTraits = [];
      for (let i = 0; i < numTraits; i++) {
        const randomTrait = traits[Math.floor(Math.random() * traits.length)];
        if (!selectedTraits.includes(randomTrait)) {
          selectedTraits.push(randomTrait);
        }
      }

      const traitPercentages = selectedTraits.map(
        (trait) => `${trait}: ${Math.floor(Math.random() * 41) + 60}%`
      );

      const analysis = `🔮 *Character Analysis* 🔮\n\n` +
        `👤 *User:* ${userToAnalyze.split("@")[0]}\n\n` +
        `✨ *Key Traits:*\n${traitPercentages.join("\n")}\n\n` +
        `🎯 *Overall Rating:* ${Math.floor(Math.random() * 21) + 80}%\n\n` +
        `Note: This is a fun analysis and should not be taken seriously!`;

      return sock.sendMessage(from, {
        image: { url: profilePic },
        caption: analysis,
        mentions: [userToAnalyze],
      });
    } catch (error) {
      console.error("Error in character command:", error);
      return sendMessageWTyping(from, {
        text: "Failed to analyze character! Try again later.",
      }, { quoted: msg });
    }
  },
});
