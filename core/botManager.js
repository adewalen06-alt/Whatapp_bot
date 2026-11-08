import NodeCache from "node-cache";

// Bot registry: botId → { sock, status, qr, botNumber, myNumber, connectedAt }
const bots = new Map();

// QR codes per bot (for dashboard QR pages)
const qrCodes = new Map();

// Status per bot: "disconnected" | "connecting" | "connected" | "qr"
const botStatus = new Map();

const botMetrics = new Map();

export const botManager = {
  // Register a new bot instance
  register(botId, info = {}) {
    bots.set(botId, {
      sock: null,
      status: "disconnected",
      qr: null,
      botNumber: info.botNumber || [],
      myNumber: info.myNumber || [],
      connectedAt: null,
      lastQR: null,
      ...info,
    });
    botStatus.set(botId, "disconnected");
    qrCodes.set(botId, null);
    botMetrics.set(botId, { messages: 0, commands: 0, errors: 0 });
    console.log(`🤖 Bot registered: ${botId}`);
  },

  // Unregister and cleanup a bot
  async unregister(botId) {
    const bot = bots.get(botId);
    if (bot?.sock) {
      try { bot.sock.end(undefined); } catch {}
    }
    bots.delete(botId);
    botStatus.delete(botId);
    qrCodes.delete(botId);
    botMetrics.delete(botId);
    console.log(`🗑️ Bot unregistered: ${botId}`);
  },

  // Get a bot by ID
  get(botId) {
    return bots.get(botId);
  },

  // Get all bots
  getAll() {
    const result = [];
    for (const [botId, bot] of bots) {
      result.push({
        botId,
        status: botStatus.get(botId) || "disconnected",
        qr: qrCodes.get(botId) || null,
        botNumber: bot.botNumber || [],
        myNumber: bot.myNumber || [],
        connectedAt: bot.connectedAt || null,
        metrics: botMetrics.get(botId) || { messages: 0, commands: 0, errors: 0 },
        hasSocket: !!bot.sock,
      });
    }
    return result;
  },

  // Set socket for a bot
  setSock(botId, sock) {
    const bot = bots.get(botId);
    if (bot) bot.sock = sock;
  },

  // Get socket for a bot
  getSock(botId) {
    const bot = bots.get(botId);
    return bot?.sock || null;
  },

  // Update bot status
  setStatus(botId, status) {
    botStatus.set(botId, status);
    const bot = bots.get(botId);
    if (bot && status === "connected") bot.connectedAt = Date.now();
    if (bot && status === "disconnected") bot.connectedAt = null;
  },

  // Get bot status
  getStatus(botId) {
    return botStatus.get(botId) || "disconnected";
  },

  // Set QR code for a bot
  setQR(botId, qr) {
    qrCodes.set(botId, qr);
    if (qr) {
      botStatus.set(botId, "qr");
      const bot = bots.get(botId);
      if (bot) bot.lastQR = qr;
    }
  },

  // Get QR code for a bot
  getQR(botId) {
    return qrCodes.get(botId) || null;
  },

  // Clear QR code
  clearQR(botId) {
    qrCodes.set(botId, null);
  },

  // Increment message counter
  incMessages(botId) {
    const m = botMetrics.get(botId) || { messages: 0, commands: 0, errors: 0 };
    m.messages += 1;
    botMetrics.set(botId, m);
  },

  // Increment command counter
  incCommands(botId) {
    const m = botMetrics.get(botId) || { messages: 0, commands: 0, errors: 0 };
    m.commands += 1;
    botMetrics.set(botId, m);
  },

  // Increment error counter
  incErrors(botId) {
    const m = botMetrics.get(botId) || { messages: 0, commands: 0, errors: 0 };
    m.errors += 1;
    botMetrics.set(botId, m);
  },

  // Get all bot IDs
  getBotIds() {
    return [...bots.keys()];
  },

  // Check if a bot exists
  has(botId) {
    return bots.has(botId);
  },
};

// Cache for bot-specific data (group metadata, etc. per bot)
const botCaches = new Map();

export const getBotCache = (botId) => {
  if (!botCaches.has(botId)) {
    botCaches.set(botId, new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false }));
  }
  return botCaches.get(botId);
};
