import fs from "fs";

export default () => ({
  cmd: ["anticall"],
  desc: "Enable/disable auto-block on incoming calls.",
  usage: "anticall on | off | status",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const ANTICALL_PATH = "./data/anticall.json";

    function readState() {
      try {
        if (!fs.existsSync(ANTICALL_PATH)) return { enabled: false };
        const raw = fs.readFileSync(ANTICALL_PATH, "utf8");
        const data = JSON.parse(raw || "{}");
        return { enabled: !!data.enabled };
      } catch {
        return { enabled: false };
      }
    }

    function writeState(enabled) {
      try {
        if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
        fs.writeFileSync(ANTICALL_PATH, JSON.stringify({ enabled: !!enabled }, null, 2));
      } catch {}
    }

    const state = readState();
    const sub = (args[0] || "").trim().toLowerCase();

    if (!sub || (sub !== "on" && sub !== "off" && sub !== "status")) {
      return sendMessageWTyping(from, {
        text:
          "*ANTICALL*\n\n" +
          ".anticall on  - Enable auto-block on incoming calls\n" +
          ".anticall off - Disable anticall\n" +
          ".anticall status - Show current status",
      }, { quoted: msg });
    }

    if (sub === "status") {
      return sendMessageWTyping(from, {
        text: `Anticall is currently *${state.enabled ? "ON" : "OFF"}*.`,
      }, { quoted: msg });
    }

    const enable = sub === "on";
    writeState(enable);
    return sendMessageWTyping(from, {
      text: `Anticall is now *${enable ? "ENABLED" : "DISABLED"}*.`,
    }, { quoted: msg });
  },
});
