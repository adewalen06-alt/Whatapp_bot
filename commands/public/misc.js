import axios from "axios";

export default () => ({
  cmd: ["misc"],
  desc: "Generate canvas images (heart, tweet, oogway, etc.)",
  usage: "misc <type> <args>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;
    const sub = (args[0] || "").toLowerCase();
    const text = (args.slice(1).join(" ") || "").trim();

    if (!sub) {
      return sendMessageWTyping(from, {
        text: "Usage: .misc <heart|horny|circle|lgbt|lied|lolice|simpcard|tonikawa|its-so-stupid <text>|namecard u|b|d|oogway <q>|tweet dn|un|c|youtube-comment un|c>",
      }, { quoted: msg });
    }

    try {
      let apiUrl;
      let responseType = 'arraybuffer';

      switch (sub) {
        case 'heart':
          apiUrl = `https://api.some-random-api.com/canvas/misc/heart?avatar=${encodeURIComponent(text)}`;
          break;
        case 'horny':
          apiUrl = `https://api.some-random-api.com/canvas/misc/horny?avatar=${encodeURIComponent(text)}`;
          break;
        case 'circle':
          apiUrl = `https://api.some-random-api.com/canvas/misc/circle?avatar=${encodeURIComponent(text)}`;
          break;
        case 'lgbt':
          apiUrl = `https://api.some-random-api.com/canvas/misc/lgbt?avatar=${encodeURIComponent(text)}`;
          break;
        case 'lied':
          apiUrl = `https://api.some-random-api.com/canvas/misc/lied?avatar=${encodeURIComponent(text)}`;
          break;
        case 'lolice':
          apiUrl = `https://api.some-random-api.com/canvas/misc/lolice?avatar=${encodeURIComponent(text)}`;
          break;
        case 'simpcard':
          apiUrl = `https://api.some-random-api.com/canvas/misc/simpcard?avatar=${encodeURIComponent(text)}`;
          break;
        case 'tonikawa':
          apiUrl = `https://api.some-random-api.com/canvas/misc/tonikawa?avatar=${encodeURIComponent(text)}`;
          break;
        case 'its-so-stupid':
          apiUrl = `https://api.some-random-api.com/canvas/misc/its-so-stupid?dog=${encodeURIComponent(text)}`;
          break;
        case 'namecard':
          apiUrl = `https://api.some-random-api.com/canvas/misc/namecard?avatar=${encodeURIComponent(text)}&username=${encodeURIComponent(text)}&birthday=01/01/2000&color=blue`;
          break;
        case 'oogway':
          apiUrl = `https://api.some-random-api.com/canvas/misc/oogway?quote=${encodeURIComponent(text)}`;
          break;
        case 'tweet':
          apiUrl = `https://api.some-random-api.com/canvas/misc/tweet?username=${encodeURIComponent(text)}&displayname=${encodeURIComponent(text)}&comment=${encodeURIComponent(text)}&avatar=https://i.imgur.com/2wzGhpF.png`;
          break;
        case 'youtube-comment':
          apiUrl = `https://api.some-random-api.com/canvas/misc/youtube-comment?username=${encodeURIComponent(text)}&comment=${encodeURIComponent(text)}&avatar=https://i.imgur.com/2wzGhpF.png`;
          break;
        default:
          return sendMessageWTyping(from, {
            text: "❌ Unsupported misc type. Use: heart, horny, circle, lgbt, lied, lolice, simpcard, tonikawa, its-so-stupid, namecard, oogway, tweet, youtube-comment",
          }, { quoted: msg });
      }

      const response = await axios.get(apiUrl, { responseType, timeout: 30000 });
      const imageBuffer = Buffer.from(response.data);

      return sock.sendMessage(from, { image: imageBuffer, caption: `🎨 ${sub} canvas!` }, { quoted: msg });
    } catch (error) {
      console.error("Misc error:", error);
      return sendMessageWTyping(from, {
        text: "❌ Failed to generate canvas image. Please try again later.",
      }, { quoted: msg });
    }
  },
});