export default () => ({
  cmd: ["ship"],
  desc: "Ship two random group members together.",
  usage: "ship",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, groupMetadata } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "❌ Failed to ship! Make sure this is a group." }, { quoted: msg });
    }

    try {
      const participants = groupMetadata?.participants?.map((v) => v.id) || [];
      if (participants.length < 2) {
        return sendMessageWTyping(from, { text: "❌ Not enough participants in this group." }, { quoted: msg });
      }

      let firstUser = participants[Math.floor(Math.random() * participants.length)];
      let secondUser = participants[Math.floor(Math.random() * participants.length)];
      while (secondUser === firstUser) {
        secondUser = participants[Math.floor(Math.random() * participants.length)];
      }

      const formatMention = (id) => "@" + id.split("@")[0];

      return sendMessageWTyping(from, {
        text: `${formatMention(firstUser)} ❤️ ${formatMention(secondUser)}\nCongratulations 💖🍻`,
        mentions: [firstUser, secondUser],
      }, { quoted: msg });
    } catch (error) {
      console.error("Error in ship command:", error);
      return sendMessageWTyping(from, { text: "❌ Failed to ship! Make sure this is a group." }, { quoted: msg });
    }
  },
});
