export default () => ({
  cmd: ["sora"],
  desc: "Generate an AI video from a text prompt. (Needs external API)",
  usage: "sora <prompt>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const rawText = (args.join(" ") || "").trim();

    if (!rawText) {
      return sendMessageWTyping(from, { text: "Provide a prompt. Example: .sora anime girl with short blue hair" }, { quoted: msg });
    }

    try {
      const apiUrl = `https://okatsu-rolezapiiz.vercel.app/ai/txt2video?text=${encodeURIComponent(rawText)}`;
      const res = await fetch(apiUrl, { timeout: 60000, headers: { "user-agent": "Mozilla/5.0" } });
      const data = await res.json();

      const videoUrl = data?.videoUrl || data?.result || data?.data?.videoUrl;
      if (!videoUrl) {
        throw new Error("No videoUrl in API response");
      }

      return sock.sendMessage(from, {
        video: { url: videoUrl },
        mimetype: "video/mp4",
        caption: `Prompt: ${rawText}`,
      }, { quoted: msg });
    } catch (error) {
      console.error("[SORA] error:", error?.message || error);
      return sendMessageWTyping(from, { text: "Failed to generate video. Try a different prompt later." }, { quoted: msg });
    }
  },
});
