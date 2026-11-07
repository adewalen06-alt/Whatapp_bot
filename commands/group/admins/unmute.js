export default () => ({
  cmd: ["unmute"],
  desc: "Unmute the group (disable announcement mode).",
  usage: "unmute",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "This command only works in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "Only group admins can unmute the group." }, { quoted: msg });
    }

    try {
      await sock.groupSettingUpdate(from, "not_announcement");
      return sendMessageWTyping(from, { text: "The group has been unmuted." }, { quoted: msg });
    } catch (error) {
      console.error("Error unmuting group:", error);
      return sendMessageWTyping(from, { text: "Failed to unmute the group." }, { quoted: msg });
    }
  },
});
