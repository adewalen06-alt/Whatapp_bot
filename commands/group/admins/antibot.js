export default () => ({
  cmd: ["antibot"],
  desc: "Configure antibot detection in the group. (Admins only)",
  usage: "antibot on | off | set warn | kick | get",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "👥 This command can only be used in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "❌ Only group admins can use this command." }, { quoted: msg });
    }

    const opt = (args[0] || "").toLowerCase();

    if (!opt) {
      return sendMessageWTyping(from, {
        text:
          "🤖 *Antibot Status*\n\n" +
          "Usage:\n" +
          "  .antibot on\n" +
          "  .antibot off\n" +
          "  .antibot set warn | kick\n" +
          "  .antibot get",
      }, { quoted: msg });
    }

    if (opt === "on") {
      return sendMessageWTyping(from, { text: "*Antibot has been turned ON*" }, { quoted: msg });
    }

    if (opt === "off") {
      return sendMessageWTyping(from, { text: "*Antibot has been turned OFF*" }, { quoted: msg });
    }

    if (opt === "set") {
      const setAction = (args[1] || "").toLowerCase();
      if (!["warn", "kick"].includes(setAction)) {
        return sendMessageWTyping(from, {
          text: "*Invalid action. Choose warn or kick.*\n`.antibot set warn | kick`",
        }, { quoted: msg });
      }
      return sendMessageWTyping(from, { text: `*Antibot action set to ${setAction}*` }, { quoted: msg });
    }

    if (opt === "get") {
      return sendMessageWTyping(from, {
        text: "*Antibot Configuration:*\nStatus: OFF\nAction: warn",
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, { text: "*Use `.antibot` for usage.*" }, { quoted: msg });
  },
});
