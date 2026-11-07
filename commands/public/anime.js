export default () => ({
  cmd: ["anime", "animu"],
  desc: "Send an anime sticker/image. Types: nom, poke, cry, kiss, pat, hug, wink, face-palm, quote",
  usage: "anime <type>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const subArg = args[0] || "";
    const type = subArg.toLowerCase();

    const supported = ["nom", "poke", "cry", "kiss", "pat", "hug", "wink", "face-palm", "quote"];

    if (!type) {
      return sendMessageWTyping(from, {
        text: `Usage: .anime <type>\nTypes: ${supported.join(", ")}`,
      }, { quoted: msg });
    }

    if (!supported.includes(type)) {
      return sendMessageWTyping(from, {
        text: `❌ Unsupported type: ${type}. Try one of: ${supported.join(", ")}`,
      }, { quoted: msg });
    }

    try {
      const res = await fetch(`https://api.some-random-api.com/animu/${type}`);
      const data = await res.json();

      if (data.link) {
        const link = data.link;
        const lower = link.toLowerCase();
        const isGifLink = lower.endsWith(".gif");
        const isImageLink = lower.match(/\.(jpg|jpeg|png|webp)$/);

        if (isGifLink || isImageLink) {
          try {
            const resp = await fetch(link);
            const mediaBuf = Buffer.from(await resp.arrayBuffer());
            return sock.sendMessage(from, { image: { url: link }, caption: `anime: ${type}` }, { quoted: msg });
          } catch (error) {
            console.error("Error fetching animu media:", error);
          }
        }
      }

      if (data.quote) {
        return sendMessageWTyping(from, { text: data.quote }, { quoted: msg });
      }

      return sendMessageWTyping(from, { text: "❌ Failed to fetch animu." }, { quoted: msg });
    } catch (err) {
      console.error("Error in anime command:", err);
      return sendMessageWTyping(from, { text: "❌ An error occurred while fetching animu." }, { quoted: msg });
    }
  },
});
