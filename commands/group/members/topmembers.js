export default () => ({
  cmd: ["topmembers"],
  desc: "Show top members by message count in the group.",
  usage: "topmembers",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, groupMetadata } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "This command is only available in group chats." }, { quoted: msg });
    }

    const fs = await import("fs");
    const path = await import("path");

    const dataFilePath = path.join(process.cwd(), "data", "messageCount.json");

    let messageCounts = {};
    try {
      if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath);
        messageCounts = JSON.parse(data);
      }
    } catch {}

    const groupCounts = messageCounts[from] || {};

    const sortedMembers = Object.entries(groupCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (sortedMembers.length === 0) {
      return sendMessageWTyping(from, { text: "No message activity recorded yet." }, { quoted: msg });
    }

    let message = "🏆 Top Members Based on Message Count:\n\n";
    sortedMembers.forEach(([userId, count], index) => {
      message += `${index + 1}. @${userId.split("@")[0]} - ${count} messages\n`;
    });

    return sendMessageWTyping(from, {
      text: message,
      mentions: sortedMembers.map(([userId]) => userId),
    }, { quoted: msg });
  },
});
