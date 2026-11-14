import axios from "axios";

export default () => ({
  cmd: ["pies", "china", "indonesia", "japan", "korea", "vietnam", "hijab"],
  desc: "Get a pie/country themed image",
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

    try {
      const apiUrl = `https://api.siputzx.my.id/api/tools/pies?country=${sub}`;
      const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const imageBuffer = Buffer.from(response.data);

      return sock.sendMessage(from, { image: imageBuffer, caption: `🥧 ${sub} pie!` }, { quoted: msg });
    } catch (error) {
      console.error("Pies error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to fetch pie image. Please try again later.",
      }, { quoted: msg });
    }
  },
});