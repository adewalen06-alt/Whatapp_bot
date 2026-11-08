import { createSocket } from "./core/socket.js";
import { createEvents } from "./core/events.js";
import { botManager } from "./core/botManager.js";

let connectionAttempts = new Map();
const MAX_CONNECTION_ATTEMPTS = 5;
let lastConnectionTime = new Map();
const MIN_CONNECTION_INTERVAL = 10000;

export const onNewBot = (fn) => {
  global._onNewBot = fn;
};

export const startBot = async (botId = "default", reason = "initial") => {
  try {
    const now = Date.now();
    const last = lastConnectionTime.get(botId) || 0;

    if (now - last < MIN_CONNECTION_INTERVAL) {
      const wait = MIN_CONNECTION_INTERVAL - (now - last);
      console.log(`[${botId}] ⏳ Connection attempt too soon, retrying in ${wait}ms...`);
      setTimeout(() => startBot(botId, reason), wait);
      return null;
    }

    const attempts = (connectionAttempts.get(botId) || 0) + 1;
    connectionAttempts.set(botId, attempts);

    if (attempts >= MAX_CONNECTION_ATTEMPTS) {
      console.log(
        `[${botId}] ❌ Max connection attempts reached. Backing off for 1 minute...`,
      );
      setTimeout(() => {
        connectionAttempts.set(botId, 0);
        startBot(botId, reason);
      }, 60000);
      return null;
    }

    lastConnectionTime.set(botId, now);
    console.log(`[${botId}] 🔄 Starting socket connection (attempt ${attempts}): ${reason}`);

    const sock = await createSocket(botId);
    if (sock) {
      botManager.setSock(botId, sock);

      // Notify index.js so it can track the live sock reference
      if (global._onNewBot) global._onNewBot(botId, sock);

      createEvents(sock, startBot, null, botId);
      connectionAttempts.set(botId, 0);
      botManager.setStatus(botId, "connected");
      console.log(`[${botId}] ✅ Socket connection established successfully`);
      return sock;
    }
    return null;
  } catch (error) {
    console.error(`[${botId}] ❌ Error starting socket:`, error.message);
    return null;
  }
};

export const stopBot = async (botId = "default") => {
  await botManager.unregister(botId);
  connectionAttempts.delete(botId);
  lastConnectionTime.delete(botId);
  console.log(`[${botId}] 🛑 Bot stopped`);
};

export default startBot;
