require('dotenv').config();

const settings = {
  packname: 'Topai',
  author: '‎',
  botName: "Topai",
  botOwner: 'Nicetv1165', // Your name
  ownerNumber: '919876543210', //Set your number here without + symbol, just add country code & number without any space
  giphyApiKey: 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  commandMode: "public",
  maxStoreMessages: 20, 
  storeWriteInterval: 10000,
  description: "This is a bot for managing group commands and automating tasks.",
  version: "3.0.8",
  updateZipUrl: "https://github.com/Nicetv1165/Topai-MD/archive/refs/heads/main.zip",
  // Media / Topai API (song, video, cards, etc.)
  topaiApiUrl: process.env.TOPAI_API_URL || 'https://topaiapi.stream',
  topaiApiKey: process.env.TOPAI_API_KEY || 'topai',
  mediaApiUrl: process.env.MEDIA_API_URL || 'https://topaiapi.stream',
  mediaApiKey: process.env.MEDIA_API_KEY || 'topai',
  princeApiUrl: process.env.PRINCE_API_URL || 'https://api.princetechn.com',
  princeApiKey: process.env.PRINCE_API_KEY || 'prince',
};

module.exports = settings;
