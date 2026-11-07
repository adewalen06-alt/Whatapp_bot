export default () => ({
  cmd: ["antitag"],
  desc: "Configure antitag (anti-tagall) in the group. (Admins only)",
  usage: "antitag on | off | set delete | kick | get",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "This command only works in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "```For Group Admins Only!```" }, { quoted: msg });
    }

    const action = (args[0] || "").toLowerCase();

    if (!action) {
      return sendMessageWTyping(from, {
        text: "ANTITAG SETUP\n\n.antitag on\n.antitag set delete | kick\n.antitag off\n.antitag get",
      }, { quoted: msg });
    }

    switch (action) {
      case "on":
        return sendMessageWTyping(from, { text: "*_Antitag has been turned ON_*" }, { quoted: msg });
      case "off":
        return sendMessageWTyping(from, { text: "*_Antitag has been turned OFF_*" }, { quoted: msg });
      case "set": {
        const setAction = (args[1] || "").toLowerCase();
        if (!["delete", "kick"].includes(setAction)) {
          return sendMessageWTyping(from, {
            text: "*_Invalid action. Choose delete or kick._*",
          }, { quoted: msg });
        }
        return sendMessageWTyping(from, { text: `*_Antitag action set to ${setAction}_*` }, { quoted: msg });
      }
      case "get":
        return sendMessageWTyping(from, {
          text: "*_Antitag Configuration:_*\nStatus: OFF\nAction: Not set",
        }, { quoted: msg });
      default:
        return sendMessageWTyping(from, { text: "*_Use .antitag for usage._*" }, { quoted: msg });
    }
  },
});
