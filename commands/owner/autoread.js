import fs from "fs";

export default () => ({
  cmd: ["autoread"],
  desc: "Toggle auto-read messages. (Owner only)",
  usage: "autoread on | off",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner } = msgInfoObj;

    const configPath = "./data/autoread.json";

    function initConfig() {
      try {
        if (!fs.existsSync(configPath)) {
          fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
        }
        return JSON.parse(fs.readFileSync(configPath));
      } catch {
        return { enabled: false };
      }
    }

    const senderId = msg.key.participant || msg.key.remoteJid;
    if (!msg.key.fromMe && !isOwner) {
      return sendMessageWTyping(from, {
        text: "❌ This command is only available for the owner!",
      }, { quoted: msg });
    }

    const commandArgs = (args.join(" ") || "").trim().split(" ").slice(1);

    const config = initConfig();

    if (commandArgs.length > 0) {
      const action = commandArgs[0].toLowerCase();
      if (action === "on" || action === "enable") {
        config.enabled = true;
      } else if (action === "off" || action === "disable") {
        config.enabled = false;
      } else {
        return sendMessageWTyping(from, {
          text: "❌ Invalid option! Use: .autoread on/off",
        }, { quoted: msg });
      }
    } else {
      config.enabled = !config.enabled;
    }

    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch {}

    return sendMessageWTyping(from, {
      text: `✅ Auto-read has been ${config.enabled ? "enabled" : "disabled"}!`,
    }, { quoted: msg });
  },
});
