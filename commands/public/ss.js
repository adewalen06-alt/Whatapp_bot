export default () => ({
  cmd: ["ss", "ssweb", "screenshot"],
  desc: "Take a screenshot of a website. (Needs external API)",
  usage: "ss <url>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const match = (args.join(" ") || "").trim();

    if (!match) {
      return sendMessageWTyping(from, {
        text: "*SCREENSHOT TOOL*\n\n*.ss <url>*\n*.ssweb <url>*\n*.screenshot <url>*\n\nTake a screenshot of any website\n\nExample:\n.ss https://google.com",
      }, { quoted: msg });
    }

    const url = match.trim();

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return sendMessageWTyping(from, {
        text: "❌ Please provide a valid URL starting with http:// or https://",
      }, { quoted: msg });
    }

    try {
      const apiUrl = `https://api.siputzx.my.id/api/tools/ssweb?url=${encodeURIComponent(url)}&theme=light&device=desktop`;
      const response = await fetch(apiUrl, { headers: { accept: "*/*" } });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());

      return sock.sendMessage(from, { image: imageBuffer }, { quoted: msg });
    } catch (error) {
      console.error("❌ Error in ss command:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to take screenshot. Please try again in a few minutes.\n\nPossible reasons:\n• Invalid URL\n• Website is blocking screenshots\n• Website is down\n• API service is temporarily unavailable",
      }, { quoted: msg });
    }
  },
});
