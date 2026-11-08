import NodeCache from "node-cache";
import makeWASocket, { makeCacheableSignalKeyStore } from "baileys";
import { fetchLatestBaileysVersion } from "baileys";
import { useMongoDBAuthState } from "./auth.js";
import P from "pino";
import groupMetaStore from "../cache/groupMetaStore.js";
import { getGroupMeta } from "../cache/redisCache.js";
import userDevicesCache from "../cache/userDevicesCache.js";
import { botManager } from "./botManager.js";

const logger = P({ level: "silent" });

export const createSocket = async (botId = "default") => {
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`[${botId}] using WA v${version.join(".")}, isLatest: ${isLatest}\n`);

  // Use per-bot MongoDB auth state
  const { state, saveCreds, cleanup } = await useMongoDBAuthState(botId);

  console.log(`[${botId}] ✅ Using MongoDB auth state`);
  if (state.creds?.me) {
    console.log(`[${botId}] ✅ Authenticated as: ${state.creds.me.id}`);
  } else {
    console.log(`[${botId}] ⚠️ No existing credentials - QR scan required`);
  }

  const socketStartTime = Date.now();

  // Per-bot message cache (outgoing messages for retry handling)
  const messageCache = new NodeCache({
    stdTTL: 600,
    checkperiod: 60,
    maxKeys: 500,
    useClones: false,
  });

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      try {
        const cacheKey = `${key.remoteJid}:${key.id}`;
        if (messageCache.has(cacheKey)) {
          return messageCache.get(cacheKey);
        }
        return undefined;
      } catch (error) {
        logger.error(`[${botId}] Error in getMessage:`, error);
        return undefined;
      }
    },
    cachedGroupMetadata: async (jid) => {
      const hit = groupMetaStore.get(jid);
      if (hit) return hit;
      const meta = await getGroupMeta(jid);
      if (meta) groupMetaStore.set(jid, meta);
      return meta ?? undefined;
    },
    userDevicesCache,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 90000,
    keepAliveIntervalMs: 15000,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    emitOwnEvents: true,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 5,
    uploadTimeoutMs: 60000,
    patchMessageBeforeSending: (msg) => msg,
  });

  // Wrap sendMessage to cache outgoing messages
  const send = sock.sendMessage.bind(sock);
  sock.sendMessage = async (...args) => {
    const sent = await send(...args);
    try {
      if (sent?.message && sent.key?.id) {
        messageCache.set(`${sent.key.remoteJid}:${sent.key.id}`, sent.message);
      }
    } catch {}
    return sent;
  };

  // Save credentials on update
  sock.ev.on("creds.update", async () => {
    try {
      await saveCreds();
      console.log(`[${botId}] 💾 Credentials saved to MongoDB`);
    } catch (error) {
      console.error(`[${botId}] Error updating credentials:`, error);
    }
  });

  // Cleanup on socket close
  sock.ws.on("close", () => {
    cleanup();
    messageCache.flushAll();
    console.log(`[${botId}] 🧹 Socket cleanup completed`);
  });

  // Connection error handling
  sock.ev.on("connection.update", (update) => {
    if (update.lastDisconnect?.error) {
      const error = update.lastDisconnect.error;
      console.log(`[${botId}] Connection error details:`, error.message);
      if (error.message.includes("session") || error.message.includes("prekey")) {
        console.log(`[${botId}] Clearing message caches due to session issues...`);
        messageCache.flushAll();
      }
    }
  });

  sock.startupTime = socketStartTime;
  return sock;
};

export default createSocket;
