import { getGroupData, group } from "../../../db/groupData.js";

const linkPatterns = {
  whatsappGroup: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/i,
  whatsappChannel: /wa\.me\/channel\/[A-Za-z0-9]{20,}/i,
  telegram: /t\.me\/[A-Za-z0-9_]+/i,
  allLinks: /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i,
};

const getAntilinkSetting = async (groupJid) => {
  const data = await getGroupData(groupJid);
  if (!data || !data.antilink) return "off";
  return data.antilink.enabled ? (data.antilink.mode || "allLinks") : "off";
};

const setAntilink = async (groupJid, enabled, mode, action) => {
  await group.updateOne(
    { _id: groupJid },
    {
      $set: {
        antilink: { enabled: enabled === "on", mode: mode || "allLinks", action: action || "delete" },
      },
    },
    { upsert: true },
  );
};

const removeAntilink = async (groupJid) => {
  await group.updateOne(
    { _id: groupJid },
    { $set: { antilink: { enabled: false, mode: "allLinks", action: "delete" } } },
  );
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
  const { isGroup, sendMessageWTyping, groupAdmins, senderJid, botNumber } = msgInfoObj;

  if (!isGroup) {
    return sendMessageWTyping(from, { text: "❌ This command only works in groups." }, { quoted: msg });
  }

  const isAdmin = groupAdmins.includes(senderJid) || botNumber.includes(senderJid);
  if (!isAdmin) {
    return sendMessageWTyping(from, { text: "```For Group Admins Only!```" }, { quoted: msg });
  }

  const sub = args[0] ? args[0].toLowerCase() : "";

  switch (sub) {
    case "on": {
      const current = await getAntilinkSetting(from);
      if (current !== "off") {
        return sendMessageWTyping(from, { text: "*_Antilink is already on_*" }, { quoted: msg });
      }
      await setAntilink(from, "on", "allLinks", "delete");
      return sendMessageWTyping(from, { text: "*_Antilink has been turned ON_*" }, { quoted: msg });
    }

    case "off": {
      await removeAntilink(from);
      return sendMessageWTyping(from, { text: "*_Antilink has been turned OFF_*" }, { quoted: msg });
    }

    case "set": {
      const action = args[1] ? args[1].toLowerCase() : "";
      if (!["delete", "kick", "warn"].includes(action)) {
        return sendMessageWTyping(
          from,
          { text: "*_Invalid action. Use: .antilink set delete | kick | warn_*" },
          { quoted: msg },
        );
      }
      const mode = await getAntilinkSetting(from);
      await setAntilink(from, "on", mode === "off" ? "allLinks" : mode, action);
      return sendMessageWTyping(
        from,
        { text: `*_Antilink action set to ${action}_*` },
        { quoted: msg },
      );
    }

    case "mode": {
      const m = args[1] ? args[1].toLowerCase() : "";
      if (!["whatsappGroup", "whatsappChannel", "telegram", "allLinks"].includes(m)) {
        return sendMessageWTyping(
          from,
          { text: "*_Invalid mode. Use: .antilink mode whatsappGroup | whatsappChannel | telegram | allLinks_*" },
          { quoted: msg },
        );
      }
      const action = await getGroupData(from);
      await setAntilink(from, "on", m, action?.antilink?.action || "delete");
      return sendMessageWTyping(from, { text: `*_Antilink mode set to ${m}_*` }, { quoted: msg });
    }

    case "get": {
      const data = await getGroupData(from);
      const al = data?.antilink;
      return sendMessageWTyping(
        from,
        {
          text: `*_Antilink Configuration:_*\nStatus: ${al && al.enabled ? "ON" : "OFF"}\nMode: ${al?.mode || "allLinks"}\nAction: ${al?.action || "delete"}`,
        },
        { quoted: msg },
      );
    }

    default: {
      return sendMessageWTyping(
        from,
        {
          text: `*ANTILINK SETUP*\n\n.antilink on\n.antilink off\n.antilink set delete | kick | warn\n.antilink mode whatsappGroup | whatsappChannel | telegram | allLinks\n.antilink get`,
        },
        { quoted: msg },
      );
    }
  }
};

export default () => ({
  cmd: ["antilink"],
  desc: "Block links in groups. Modes: whatsappGroup, whatsappChannel, telegram, allLinks. Actions: delete, kick, warn.",
  usage: "antilink on | off | set <action> | mode <mode> | get",
  handler,
});
