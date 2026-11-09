import getConnectionUpdate from "./connectionUpdate.js";
import getCommand from "./messages.js";
import getGroupEvent from "./groupEvent.js";
import getCallEvent from "./callEvents.js";
import groupMetaStore from "../cache/groupMetaStore.js";
import { setGroupMeta, delGroupMeta, isRedisEnabled } from "../cache/redisCache.js";
import { botManager } from "./botManager.js";

const WARM_EVERY_MS = 50 * 60 * 1000;
const warmTimers = new Map();

const warmGroups = (sock, cache, botId) =>
  sock
    .groupFetchAllParticipating()
    .then((groups) => {
      for (const jid of groupMetaStore.keys()) {
        if (!groups[jid]) {
          groupMetaStore.del(jid);
          cache.del(jid + ":groupMetadata");
          delGroupMeta(jid);
        }
      }
      for (const [jid, meta] of Object.entries(groups)) {
        groupMetaStore.set(jid, meta);
        if (isRedisEnabled) setGroupMeta(jid, meta);
        cache.set(jid + ":groupMetadata", meta, 60 * 60);
      }
      console.log(`[${botId}] ⚡ Warmed metadata for ${Object.keys(groups).length} groups`);
    })
    .catch((e) => console.error(`[${botId}] Group warm-up failed:`, e.message));

export const createEvents = (sock, startSock, cache, botId = "default") => {
  const botJid = sock.user?.id?.replace(/:\d+@/, "@");

  sock.ev.process(async (event) => {
    try {
      if (event["messages.upsert"]) {
        const { type, messages } = event["messages.upsert"];
        if (type === "notify") {
          const validMessages = messages.filter(
            (msg) =>
              msg &&
              msg.message &&
              msg.key?.remoteJid &&
              (!msg.key.fromMe ||
                msg.key.remoteJid.replace(/:\d+@/, "@") === botJid) &&
              Object.keys(msg.message).length > 0,
          );

          await Promise.all(
            validMessages.map((msg) =>
              getCommand(sock, msg, cache).catch((err) => {
                console.error(`[${botId}] Error processing message:`, err);
                console.error(`[${botId}] Message key:`, msg.key);
              }),
            ),
          );

          botManager.incMessages(botId);
        }
      }

      if (event["connection.update"]) {
        await getConnectionUpdate(botId, startSock, event["connection.update"]);
        const { qr, isOnline, connection } = event["connection.update"];

        if (qr) {
          botManager.setStatus(botId, "qr");
          botManager.setQR(botId, qr);
          console.log(`[${botId}] 📱 QR code generated`);
        }

        if (isOnline || connection === "open") {
          botManager.setStatus(botId, "connected");
          botManager.clearQR(botId);
          const bot = botManager.get(botId);
          if (bot) {
            bot.botNumber = [
              ...(bot.botNumber || []),
              `${botJid.split("@")[0]}@s.whatsapp.net`,
            ].filter(Boolean);
          }
          console.log(`[${botId}] ✅ Connected as ${botJid}`);
          warmGroups(sock, cache, botId);
          if (warmTimers.has(botId)) clearInterval(warmTimers.get(botId));
          warmTimers.set(
            botId,
            setInterval(() => warmGroups(sock, cache, botId), WARM_EVERY_MS).unref(),
          );
        }

        if (connection === "close") {
          botManager.setStatus(botId, "disconnected");
          console.log(`[${botId}] ❌ Disconnected`);
        }
      }

      if (event["group-participants.update"]) {
        await getGroupEvent(sock, event["group-participants.update"], cache);
      }

      if (event["call"]) {
        await getCallEvent(sock, event["call"]);
      }
    } catch (err) {
      console.error(`[${botId}] Error processing event:`, err);
      console.error(`[${botId}] Event type:`, Object.keys(event));
      botManager.incErrors(botId);
    }
  });
};

export default createEvents;
