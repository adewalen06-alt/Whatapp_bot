export default () => ({
  cmd: ["simp"],
  desc: "Generate a simp card for a mentioned or replied user. (Needs API)",
  usage: "simp @user | reply",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal } = msgInfoObj;

    let who = msg.key.participant || msg.key.remoteJid;
    if (extendedMessageOriginal) {
      who = extendedMessageOriginal.participant || extendedMessageOriginal.mentionedJid?.[0] || who;
    }

    let avatarUrl;
    try {
      avatarUrl = await sock.profilePictureUrl(who, "image");
    } catch (error) {
      console.error("Error fetching profile picture:", error);
      avatarUrl = "https://telegra.ph/file/24fa902ead26340f3df2c.png";
    }

    try {
      const apiUrl = `https://some-random-api.com/canvas/misc/simpcard?avatar=${encodeURIComponent(avatarUrl)}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());

      return sock.sendMessage(from, {
        image: imageBuffer,
        caption: "*your religion is simping*",
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
        },
      }, { quoted: msg });
    } catch (error) {
      console.error("Error in simp command:", error);
      return sendMessageWTyping(from, {
        text: "❌ Sorry, I couldn't generate the simp card. Please try again later!",
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
        },
      }, { quoted: msg });
    }
  },
});
