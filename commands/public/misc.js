export default () => ({
  cmd: ["misc"],
  desc: "Generate canvas images (heart, tweet, oogway, etc.). (Needs API)",
  usage: "misc <type> <args>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    const sub = (args[0] || "").toLowerCase();

    return sendMessageWTyping(from, {
      text: "Usage: .misc <heart|horny|circle|lgbt|lied|lolice|simpcard|tonikawa|its-so-stupid <text>|namecard u|b|d|oogway <q>|tweet dn|un|c|youtube-comment un|c>\n\n❌ Canvas image generation needs external API. Please contact the bot owner.",
    }, { quoted: msg });
  },
});
