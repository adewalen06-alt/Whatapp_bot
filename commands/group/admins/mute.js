export default () => ({
  cmd: ["mute"],
  desc: "Mute the group (announcement mode only).",
  usage: "mute [minutes]",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isGroup, isGroupAdmin, isOwner } = msgInfoObj;

    if (!isGroup) {
      return sendMessageWTyping(from, { text: "This command only works in groups." }, { quoted: msg });
    }

    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(from, { text: "Only group admins can use the mute command." }, { quoted: msg });
    }

    try {
      await sock.groupSettingUpdate(from, "announcement");

      const durationInMinutes = parseInt(args[0], 10);
      if (durationInMinutes !== undefined && durationInMinutes > 0) {
        const durationInMilliseconds = durationInMinutes * 60 * 1000;
        await sendMessageWTyping(from, { text: `The group has been muted for ${durationInMinutes} minutes.` }, { quoted: msg });

        setTimeout(async () => {
          try {
            await sock.groupSettingUpdate(from, "not_announcement");
            await sendMessageWTyping(from, { text: "The group has been unmuted." });
          } catch (unmuteError) {
            console.error("Error unmuting group:", unmuteError);
          }
        }, durationInMilliseconds);
      } else {
        await sendMessageWTyping(from, { text: "The group has been muted." }, { quoted: msg });
      }
    } catch (error) {
      console.error("Error muting/unmuting the group:", error);
      return sendMessageWTyping(from, { text: "An error occurred while muting/unmuting the group. Please try again." }, { quoted: msg });
    }
  },
});
