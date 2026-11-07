export default () => ({
  cmd: ["stupid"],
  desc: "Generate a stupid card for a mentioned or replied user. (Needs API)",
  usage: "stupid @user | reply",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal } = msgInfoObj;

    let who = msg.key.participant || msg.key.remoteJid;
    if (extendedMessageOriginal) {
      who = extendedMessageOriginal.participant || extendedMessageOriginal.mentionedJid?.[0] || who;
    }

    let text = args.join(" ") || "im+stupid";

    let avatarUrl;
    try {
      avatarUrl = await sock.profilePictureUrl(who, "image");
    } catch (error) {
      console.error("Error fetching profile picture:", error);
      avatarUrl = "https://telegra.ph/file/24fa902ead26340f3df2c.png";
    }

    try {
      const apiUrl = `https://some-random-api.com/canvas/misc/its-so-stupid?avatar=${encodeURIComponent(avatarUrl)}&dog=${encodeURIComponent(text)}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());

      return sock.sendMessage(from, {
        image: imageBuffer,
        caption: `*@${who.split("@")[0]}*`,
        mentions: [who],
      });
    } catch (error) {
      console.error("Error in stupid command:", error);
      return sendMessageWTyping(from, {
        text: "❌ Sorry, I couldn't generate the stupid card. Please try again later!",
      }, { quoted: msg });
    }
  },
});
