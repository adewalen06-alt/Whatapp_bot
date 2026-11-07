export default () => ({
  cmd: ["tagnotadmin"],
  desc: "Tag all non-admin members in the group.",
  usage: "tagnotadmin",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner, groupMetadata } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "This command only works in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "Only admins can use the .tagnotadmin command." }, { quoted: msg });
    }

    const participants = groupMetadata?.participants || [];
    const nonAdmins = participants.filter((p) => !p.admin).map((p) => p.id);
    if (nonAdmins.length === 0) {
      return sendMessageWTyping(from, { text: "No non-admin members to tag." }, { quoted: msg });
    }

    let text = "🔊 *Hello Everyone:*\n\n";
    nonAdmins.forEach((jid) => {
      text += `@${jid.split("@")[0]}\n`;
    });

    return sendMessageWTyping(from, { text, mentions: nonAdmins }, { quoted: msg });
  },
});
