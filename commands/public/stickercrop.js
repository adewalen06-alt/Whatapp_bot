export default () => ({
  cmd: ["stickercrop"],
  desc: "Crop replied media to sticker. (Needs ffmpeg + sharp)",
  usage: "stickercrop (reply to image/video/sticker)",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    return sendMessageWTyping(from, {
      text: "❌ Sticker cropping needs ffmpeg + sharp + node-webpmux. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
