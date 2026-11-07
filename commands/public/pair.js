export default () => ({
  cmd: ["pair"],
  desc: "Check if a WhatsApp number is registered and get pairing code. (Needs API)",
  usage: "pair <number>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const q = (args.join(" ") || "").trim();

    if (!q) {
      return sendMessageWTyping(from, {
        text: "Please provide valid WhatsApp number\nExample: .pair 91702395XXXX",
      }, { quoted: msg });
    }

    const numbers = q.split(",")
      .map((v) => v.replace(/[^0-9]/g, ""))
      .filter((v) => v.length > 5 && v.length < 20);

    if (numbers.length === 0) {
      return sendMessageWTyping(from, {
        text: "Invalid number❌ Please use the correct format!",
      }, { quoted: msg });
    }

    for (const number of numbers) {
      const whatsappID = number + "@s.whatsapp.net";
      try {
        const result = await sock.onWhatsApp(whatsappID);

        if (!result[0]?.exists) {
          return sendMessageWTyping(from, {
            text: `That number is not registered on WhatsApp❗️`,
          }, { quoted: msg });
        }

        return sendMessageWTyping(from, {
          text: "❌ Pairing code service needs API configuration. Please contact the bot owner.",
        }, { quoted: msg });
      } catch (error) {
        console.error("Pair error:", error);
        return sendMessageWTyping(from, {
          text: "An error occurred. Please try again later.",
        }, { quoted: msg });
      }
    }
  },
});
