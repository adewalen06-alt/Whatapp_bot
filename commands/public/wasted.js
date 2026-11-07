export default () => ({
  cmd: ["wasted"],
  desc: "Create a 'Wasted' effect image for a mentioned or replied user. (Needs API)",
  usage: "wasted @user | reply",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, extendedMessageOriginal } = msgInfoObj;

    let userToWaste = msg.key.participant || msg.key.remoteJid;
    if (extendedMessageOriginal) {
      userToWaste = extendedMessageOriginal.participant || extendedMessageOriginal.mentionedJid?.[0] || userToWaste;
    }

    if (!userToWaste) {
      return sendMessageWTyping(from, {
        text: "Please mention someone or reply to their message to waste them!",
      }, { quoted: msg });
    }

    try {
      let profilePic;
      try {
        profilePic = await sock.profilePictureUrl(userToWaste, "image");
      } catch {
        profilePic = "https://i.imgur.com/2wzGhpF.jpeg";
      }

      const response = await fetch(
        `https://some-random-api.com/canvas/overlay/wasted?avatar=${encodeURIComponent(profilePic)}`
      );
      const imageBuffer = Buffer.from(await response.arrayBuffer());

      return sock.sendMessage(from, {
        image: imageBuffer,
        caption: `⚰️ *Wasted* : ${userToWaste.split("@")[0]} 💀\n\nRest in pieces!`,
        mentions: [userToWaste],
      });
    } catch (error) {
      console.error("Error in wasted command:", error);
      return sendMessageWTyping(from, {
        text: "Failed to create wasted image! Try again later.",
      }, { quoted: msg });
    }
  },
});
