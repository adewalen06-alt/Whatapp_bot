/**
 * Global Configuration for WhatsApp MD Bot
 */

module.exports = {
    // Bot Owner Configuration
    ownerNumber: ['2349137250390'],
    ownerName: ['Adewale'],

    // Bot Configuration
    botName: 'Topai',
    prefix: '.',
    sessionName: 'session',
    sessionID: process.env.SESSION_ID || '',
    newsletterJid: '120363161513685998@newsletter',
    updateZipUrl: 'https://github.com/adewalen06-alt/Whatapp_bot/raw/main/topai-bot.zip',

    // Sticker Configuration
    packname: 'TOPAI',

    // Bot Behavior
    selfMode: false, // false = PUBLIC (everyone can use), true = PRIVATE (owner only)
    autoRead: false,
    autoTyping: false,
    autoBio: false,
    autoSticker: false,
    autoReact: true,
    autoReactMode: 'bot',
    autoDownload: false,

    // Group Settings Defaults
    defaultGroupSettings: {
      antilink: true,
      antilinkAction: 'warn',
      antitag: false,
      antitagAction: 'delete',
      antiall: false,
      antiviewonce: false,
      antibot: false,
      anticall: false,
      antigroupmention: false,
      antigroupmentionAction: 'delete',
      welcome: true,
      welcomeMessage: '╭╼━≪•𝙽𝙴𝚆 𝙼𝙴𝙼𝙱𝙴𝚁•≫━╾╮\n┃𝚆𝙴𝙻𝙲𝙾𝙼𝙴: @user 👋\n┃Member count: #memberCount\n┃𝚃𝙸𝙼𝙴: time⏰\n╰━━━━━━━━━━━━━━━╯\n\n*@user* Welcome to *@group*! 🎉\n*Group 𝙳𝙴𝚂𝙲𝚁𝙸𝙿𝚃𝙸𝙾𝙽*\ngroupDesc\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ botName*',
      goodbye: true,
      goodbyeMessage: 'Goodbye @user 👋 We will miss you!',
      antiSpam: false,
      antidelete: false,
      nsfw: false,
      detect: false,
      chatbot: false,
      autosticker: false
    },

    // API Keys
    apiKeys: {
      openai: '',
      deepai: '',
      remove_bg: ''
    },

    // Message Configuration
    messages: {
      wait: '⏳ Please wait...',
      success: '✅ Success!',
      error: '❌ Error occurred!',
      ownerOnly: '👑 This command is only for bot owner!',
      adminOnly: '🛡️ This command is only for group admins!',
      groupOnly: '👥 This command can only be used in groups!',
      privateOnly: '💬 This command can only be used in private chat!',
      botAdminNeeded: '🤖 Bot needs to be admin to execute this command!',
      invalidCommand: '❓ Invalid command! Type .menu for help'
    },

    // Timezone
    timezone: 'Africa/Lagos',

    // Limits
    maxWarnings: 3,

    // Social Links
    social: {
      github: 'https://github.com/adewalen06-alt/Whatapp_bot',
      instagram: '',
      youtube: ''
    }
};
