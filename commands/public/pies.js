export default () => ({
  cmd: ["pies", "china", "indonesia", "japan", "korea", "vietnam", "hijab"],
  desc: "Get a pie/country themed image. (Needs external API)",
  usage: "pies <country>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const VALID_COUNTRIES = ["india", "malaysia", "thailand", "china", "indonesia", "japan", "korea", "vietnam"];

    const sub = (args[0] || "").toLowerCase();

    if (!sub) {
      return sendMessageWTyping(from, {
        text: `Usage: .pies <country>\nCountries: ${VALID_COUNTRIES.join(", ")}`,
      }, { quoted: msg });
    }

    if (!VALID_COUNTRIES.includes(sub)) {
      return sendMessageWTyping(from, {
        text: `❌ Unsupported country: ${sub}. Try one of: ${VALID_COUNTRIES.join(", ")}`,
      }, { quoted: msg });
    }

    return sendMessageWTyping(from, {
      text: "❌ Pies image API needs external configuration. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
