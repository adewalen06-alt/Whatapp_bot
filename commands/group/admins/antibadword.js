export default () => ({
  cmd: ["antibadword"],
  desc: "Toggle antibadword filter in the group. (Admins only)",
  usage: "antibadword <word> | on | off",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "This command only works in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "```For Group Admins Only!```" }, { quoted: msg });
    }

    const match = args.join(" ");
    if (!match) {
      return sendMessageWTyping(from, {
        text: "Usage: .antibadword <word> to add a bad word filter",
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: `Antibadword filter for "${match}" is not yet configured. Use MongoDB-backed storage for persistence.`,
    }, { quoted: msg });
  },
});
