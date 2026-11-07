export default () => ({
  cmd: ["vv", "viewonce"],
  desc: "Resend a view-once message. Reply to a view-once image/video/audio.",
  usage: "vv | vv set dm | normal",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const sub = (args.join(" ") || "").trim();

    if (/^set\s+(dm|normal)$/i.test(sub)) {
      const mode = sub.split(" ")[1];
      return sendMessageWTyping(from, {
        text: `✅ .vv mode set to *${mode === "dm" ? "DM" : "Normal"}*.`,
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "🗑️ Reply to a *view-once* message with `.vv`.\nUse `.vv set dm` or `.vv set normal` to change the destination.",
    }, { quoted: msg });
  },
});
