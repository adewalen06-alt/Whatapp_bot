export default () => ({
  cmd: ["autostatus"],
  desc: "Configure auto status view and reactions. (Owner only)",
  usage: "autostatus on | off | react on | off",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner } = msgInfoObj;

    const configPath = "./data/autoStatus.json";

    const channelInfo = {
      contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
      },
    };

    try {
      const senderId = msg.key.participant || msg.key.remoteJid;
      if (!msg.key.fromMe && !isOwner) {
        return sendMessageWTyping(from, {
          text: "❌ This command can only be used by the owner!",
          ...channelInfo,
        }, { quoted: msg });
      }

      let config = { enabled: false, reactOn: false };
      try {
        const fs = await import("fs");
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        }
      } catch {}

      if (!args || args.length === 0) {
        const status = config.enabled ? "enabled" : "disabled";
        const reactStatus = config.reactOn ? "enabled" : "disabled";
        return sendMessageWTyping(from, {
          text: `🔄 *Auto Status Settings*\n\n📱 *Auto Status View:* ${status}\n💫 *Status Reactions:* ${reactStatus}\n\n*Commands:*\n.autostatus on - Enable auto status view\n.autostatus off - Disable auto status view\n.autostatus react on - Enable status reactions\n.autostatus react off - Disable status reactions`,
          ...channelInfo,
        }, { quoted: msg });
      }

      const command = args[0].toLowerCase();

      if (command === "on") {
        config.enabled = true;
        try {
          const fs = await import("fs");
          fs.writeFileSync(configPath, JSON.stringify(config));
        } catch {}
        return sendMessageWTyping(from, {
          text: "✅ Auto status view has been enabled!\nBot will now automatically view all contact statuses.",
          ...channelInfo,
        }, { quoted: msg });
      } else if (command === "off") {
        config.enabled = false;
        try {
          const fs = await import("fs");
          fs.writeFileSync(configPath, JSON.stringify(config));
        } catch {}
        return sendMessageWTyping(from, {
          text: "❌ Auto status view has been disabled!\nBot will no longer automatically view statuses.",
          ...channelInfo,
        }, { quoted: msg });
      } else if (command === "react") {
        if (!args[1]) {
          return sendMessageWTyping(from, {
            text: "❌ Please specify on/off for reactions!\nUse: .autostatus react on/off",
            ...channelInfo,
          }, { quoted: msg });
        }
        const reactCommand = args[1].toLowerCase();
        if (reactCommand === "on") {
          config.reactOn = true;
          try {
            const fs = await import("fs");
            fs.writeFileSync(configPath, JSON.stringify(config));
          } catch {}
          return sendMessageWTyping(from, {
            text: "💫 Status reactions have been enabled!\nBot will now react to status updates.",
            ...channelInfo,
          }, { quoted: msg });
        } else if (reactCommand === "off") {
          config.reactOn = false;
          try {
            const fs = await import("fs");
            fs.writeFileSync(configPath, JSON.stringify(config));
          } catch {}
          return sendMessageWTyping(from, {
            text: "❌ Status reactions have been disabled!\nBot will no longer react to status updates.",
            ...channelInfo,
          }, { quoted: msg });
        } else {
          return sendMessageWTyping(from, {
            text: "❌ Invalid reaction command! Use: .autostatus react on/off",
            ...channelInfo,
          }, { quoted: msg });
        }
      } else {
        return sendMessageWTyping(from, {
          text: "❌ Invalid command! Use:\n.autostatus on/off - Enable/disable auto status view\n.autostatus react on/off - Enable/disable status reactions",
          ...channelInfo,
        }, { quoted: msg });
      }
    } catch (error) {
      console.error("Error in autostatus command:", error);
      return sendMessageWTyping(from, {
        text: "❌ Error occurred while managing auto status!",
        ...channelInfo,
      }, { quoted: msg });
    }
  },
});
