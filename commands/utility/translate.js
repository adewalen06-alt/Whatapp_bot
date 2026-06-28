/**
 * Translate Command - Translate text using free API
 */
const axios = require('axios');

module.exports = {
  name: 'tr',
  aliases: ['translate', 'lang'],
  category: 'utility',
  description: 'Translate text to any language',
  usage: '.tr <lang_code> <text> OR .tr <text> (auto-detect → English)',

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    if (!args.length) {
      return extra.reply(
        '❌ Usage: .tr <lang_code> <text>\n\n' +
        'Examples:\n' +
        '.tr es Hello world → Spanish\n' +
        '.tr fr Good morning\n' +
        '.tr ja I love coding\n\n' +
        'Common codes: en, es, fr, de, ja, ko, ar, pt, hi, ru, zh'
      );
    }

    // Determine target language and text
    const langCodes = ['en','es','fr','de','ja','ko','ar','pt','hi','ru','zh','tr','it','pl','nl','sv','id','th','vi','ms'];
    let targetLang = 'en';
    let textToTranslate;

    if (langCodes.includes(args[0].toLowerCase())) {
      targetLang = args[0].toLowerCase();
      textToTranslate = args.slice(1).join(' ');
    } else {
      textToTranslate = args.join(' ');
    }

    if (!textToTranslate) {
      return extra.reply('❌ Please provide text to translate.');
    }

    try {
      // Use MyMemory free translation API
      const res = await axios.get('https://api.mymemory.translated.net/get', {
        params: { q: textToTranslate, langpair: `auto|${targetLang}` },
        timeout: 10000
      });

      const data = res.data;
      if (data.responseStatus !== 200) throw new Error(data.responseDetails || 'Translation failed');

      const translated = data.responseData.translatedText;
      const detectedLang = data.responseData.detectedLanguage || 'auto';

      await extra.reply(
        `🌐 *Translation*\n\n` +
        `📝 Original (${detectedLang}):\n${textToTranslate}\n\n` +
        `✅ Translated (${targetLang}):\n*${translated}*\n\n` +
        `> Topai Bot`
      );
    } catch (err) {
      extra.reply('❌ Translation failed: ' + err.message);
    }
  }
};
