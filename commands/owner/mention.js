export default () => ({
  cmd: ["mention"],
  desc: "Toggle auto-reply when bot is mentioned. (Owner only)",
  usage: "mention on | off",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner } = msgInfoObj;

    if (!msg.key.fromMe && !isOwner) {
      return sendMessageWTyping(from, { text: "Only Owner or Sudo can use this command." }, { quoted: msg });
    }

    const onoff = (args.join(" ") || "").trim().toLowerCase();
    if (!onoff || !["on", "off"].includes(onoff)) {
      return sendMessageWTyping(from, { text: "Usage: .mention on|off" }, { quoted: msg });
    }

    return sendMessageWTyping(from, { text: `Mention reply ${onoff === "on" ? "enabled" : "disabled"}.` }, { quoted: msg });
  },
});
