export default () => ({
  cmd: ["antidelete"],
  desc: "Toggle antidelete feature. (Owner only)",
  usage: "antidelete on | off",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner } = msgInfoObj;

    if (!msg.key.fromMe && !isOwner) {
      return sendMessageWTyping(from, { text: "*Only the bot owner can use this command.*" }, { quoted: msg });
    }

    const match = (args[0] || "").toLowerCase();

    if (!match) {
      return sendMessageWTyping(from, {
        text: "*ANTIDELETE SETUP*\n\nCurrent Status: Unknown\n\n.antidelete on - Enable\n.antidelete off - Disable",
      }, { quoted: msg });
    }

    if (match === "on") {
      return sendMessageWTyping(from, { text: "*Antidelete enabled*" }, { quoted: msg });
    } else if (match === "off") {
      return sendMessageWTyping(from, { text: "*Antidelete disabled*" }, { quoted: msg });
    } else {
      return sendMessageWTyping(from, { text: "*Invalid command. Use .antidelete to see usage.*" }, { quoted: msg });
    }
  },
});
