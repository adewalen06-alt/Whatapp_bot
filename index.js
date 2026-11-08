import { startBot, stopBot, onNewBot } from "./connection.js";
import { mongoReady } from "./db/client.js";
import { startReminderScheduler } from "./utils/reminderScheduler.js";
import getDate from "./utils/date.js";
import { normalizeJID } from "./utils/lid.js";
import adminRouter from "./routes/admin.js";
import messageQueue from "./queue/messageQueue.js";
import {
  pushLog,
  subscribe as subscribeAdminEvents,
  getLogs,
  getActivity,
} from "./notify/adminEvents.js";
import { botManager } from "./core/botManager.js";

// ── Console interceptor — feeds log ring buffer + deduplication ──────────────
const _log = console.log.bind(console);
const _info = console.info.bind(console);
const _warn = console.warn.bind(console);
const _error = console.error.bind(console);

const _SESSION_SPAM = ["Closing session:", "Removing old closed session:"];

let _startupTime = Date.now();
function _suppressStartupNoise(msg) {
  if (msg === "💾 Credentials saved to MongoDB" && Date.now() - _startupTime < 10000) return true;
  return false;
}

console.log = (...a) => {
  const s = String(a[0]);
  if (_suppressStartupNoise(s)) return;
  _log(...a);
  pushLog("info", ...a);
};
console.info = (...a) => {
  if (_SESSION_SPAM.some((s) => String(a[0]).startsWith(s))) return;
  _info(...a);
  pushLog("info", ...a);
};
console.warn = (...a) => {
  _warn(...a);
  pushLog("warn", ...a);
};
console.error = (...a) => {
  _error(...a);
  pushLog("error", ...a);
};

import cors from "cors";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import bodyParser from "body-parser";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : false,
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

if (!process.env.SESSION_SECRET) {
  console.error(
    "FATAL: SESSION_SECRET environment variable is not set. Cannot run application securely.",
  );
  process.exit(1);
}

if (!process.env.ADMIN_PASSWORD) {
  console.warn("ADMIN_PASSWORD is not set — password login is disabled (Google login only).");
}

app.set("trust proxy", 1);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_KEY,
    ttl: 30 * 24 * 60 * 60,
    touchAfter: 60 * 60,
  }),
  cookie: { secure: "auto", httpOnly: true, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 },
});
app.use(sessionMiddleware);

const baseUrl = (process.env.HOST_URL || "http://localhost:8000").replace(/\/$/, "");
const googleAuthEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (googleAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${baseUrl}/auth/google/callback`,
      },
      (_accessToken, _refreshToken, profile, done) => done(null, profile),
    ),
  );
} else {
  console.log("Google OAuth disabled — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set.");
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());
app.locals.googleAuthEnabled = googleAuthEnabled;

app.use(bodyParser.json({ limit: "10mb" }));
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "1d",
    etag: false,
  }),
);

app.use(
  "/admin",
  express.static(path.join(__dirname, "public", "app"), { maxAge: "1d", etag: false }),
);

app.set("views", path.join(__dirname, "./public"));
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const port = process.env.PORT || 8000;

app.get("/", (_req, res) => {
  res.redirect("/admin/");
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/", adminRouter);

const reactIndex = path.join(__dirname, "public", "app", "index.html");
app.get("/admin", (_req, res) => res.sendFile(reactIndex));
app.get("/admin/*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(reactIndex);
});

const server = app.listen(port, () => {
  const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  _log(`\n${"═".repeat(50)}`);
  _log(`  Eva Bot  ·  ${getDate()}`);
  _log(`  Port: ${port}  ·  Heap: ${mem}MB`);
  _log(`${"═".repeat(50)}\n`);
  startServer().catch((error) => {
    console.error("Application startup aborted because MongoDB is unavailable.");
    process.exitCode = 1;
    setTimeout(() => process.exit(1), 1000);
  });
});

app.on("error", (error) => {
  console.error("Web-server error:", error.message);
});

const wss = new WebSocketServer({
  server,
  maxPayload: 10 * 1024 * 1024,
  perMessageDeflate: true,
});

const PUBLIC_WS_EVENTS = new Set(["qr", "status"]);

function broadcast(payload, botId = null) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (!client.isAdmin && !PUBLIC_WS_EVENTS.has(payload.type)) return;
    // If botId specified, only send to clients subscribed to that bot
    if (botId && client.subscribedBotId && client.subscribedBotId !== botId) return;
    client.send(msg);
  });
}

const isAdminRequest = (req) =>
  new Promise((resolve) =>
    sessionMiddleware(req, {}, () => resolve(req.session?.isAdmin === true)),
  ).catch(() => false);

// ── Called for every new bot socket ──────────────────────────────────────────
function handleNewBot(botId, sock) {
  botManager.setSock(botId, sock);
  app.locals.botManager = botManager;

  sock.ev.on("connection.update", (update) => {
    const { qr, isOnline, connection } = update;

    if (qr) {
      botManager.setStatus(botId, "qr");
      botManager.setQR(botId, qr);
      broadcast({ type: "qr", botId, qr });
    }

    if (isOnline || connection === "open") {
      botManager.setStatus(botId, "connected");
      botManager.clearQR(botId);
      broadcast({ type: "status", botId, status: "connected" });
    }

    if (connection === "close") {
      botManager.setStatus(botId, "disconnected");
      broadcast({ type: "status", botId, status: "disconnected" });
    }
  });
}

// Register hook before calling startBot so it fires for the very first bot too
onNewBot(handleNewBot);

// Forward admin events (logs, activity) to all connected WS clients
subscribeAdminEvents((event) => broadcast(event));

// Expose bot manager for admin routes
app.locals.botManager = botManager;
app.locals.startBot = startBot;
app.locals.stopBot = stopBot;

// ── WebSocket server ──────────────────────────────────────────────────────────
wss.on("connection", async (ws, req) => {
  const origin = req.headers.origin;
  if (origin) {
    let sameHost = false;
    try {
      sameHost = new URL(origin).host === req.headers.host;
    } catch {
      /* malformed origin */
    }
    if (!sameHost) return ws.close(1008, "Forbidden origin");
  }

  ws.on("error", () => {});
  ws.isAdmin = await isAdminRequest(req);
  if (ws.readyState !== WebSocket.OPEN) return;

  // Send current state of all bots
  const allBots = botManager.getAll();
  ws.send(
    JSON.stringify({
      type: "bots_snapshot",
      bots: allBots,
    }),
  );

  // Replay recent logs + activity to admins only
  if (ws.isAdmin) {
    ws.send(JSON.stringify({ type: "log_snapshot", logs: getLogs(100) }));
    ws.send(JSON.stringify({ type: "activity_snapshot", activity: getActivity() }));
  }

  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 30_000);

  ws.on("pong", () => {});

  ws.on("message", async (raw) => {
    if (!ws.isAdmin) {
      ws.send(JSON.stringify({ type: "error", error: "Unauthorized" }));
      return;
    }
    try {
      const data = JSON.parse(raw);

      // Subscribe to a specific bot's events
      if (data.type === "subscribe_bot") {
        ws.subscribedBotId = data.botId || "default";
        ws.send(
          JSON.stringify({
            type: "subscribed",
            botId: ws.subscribedBotId,
          }),
        );
        return;
      }

      // Send a message via a specific bot
      if (data.type === "send_message") {
        const { botId = "default", to, message } = data;
        if (!to || !message) {
          ws.send(JSON.stringify({ type: "error", error: "Invalid request" }));
          return;
        }
        if (message.length > 4096) {
          ws.send(JSON.stringify({ type: "error", error: "Message too long" }));
          return;
        }
        try {
          const sock = botManager.getSock(botId);
          if (!sock || !sock.user) {
            ws.send(
              JSON.stringify({
                type: "error",
                error: `Bot ${botId} is not connected`,
              }),
            );
            return;
          }
          const jid = await normalizeJID(sock, to);
          await messageQueue.enqueue(jid, () => sock.sendMessage(jid, { text: message }), 0);
          console.log("Message sent via bot", botId, "to", to, ":", message);
          ws.send(JSON.stringify({ type: "success", success: "Message sent", botId }));
        } catch (err) {
          console.error("Error handling WebSocket message:", err);
          ws.send(JSON.stringify({ type: "error", error: "Failed to send message" }));
        }
        return;
      }

      // Start a bot
      if (data.type === "start_bot") {
        const { botId = "default" } = data;
        try {
          await startBot(botId, "websocket");
          ws.send(JSON.stringify({ type: "success", success: `Bot ${botId} started`, botId }));
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", error: err.message }));
        }
        return;
      }

      // Stop a bot
      if (data.type === "stop_bot") {
        const { botId = "default" } = data;
        try {
          await stopBot(botId);
          ws.send(JSON.stringify({ type: "success", success: `Bot ${botId} stopped`, botId }));
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", error: err.message }));
        }
        return;
      }

      // Legacy single-bot send (backward compat)
      const { to, message } = data;
      if (to || message) {
        const sock = botManager.getSock("default");
        if (!sock || !sock.user) {
          ws.send(JSON.stringify({ type: "error", error: "Default bot is not connected" }));
          return;
        }
        const jid = await normalizeJID(sock, to);
        await messageQueue.enqueue(jid, () => sock.sendMessage(jid, { text: message }), 0);
        console.log("Message sent to", to, ":", message);
        ws.send(JSON.stringify({ type: "success", success: "Message sent" }));
      }
    } catch (err) {
      console.error("Error handling WebSocket message:", err);
      ws.send(JSON.stringify({ type: "error", error: "Failed to process message" }));
    }
  });

  ws.on("close", () => clearInterval(heartbeat));
  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
    clearInterval(heartbeat);
  });
});

// ── Bot start ─────────────────────────────────────────────────────────────────
async function startServer() {
  await mongoReady;

  // Register and start the default bot
  botManager.register("default");
  await startBot("default", "start");

  startReminderScheduler();

  app.post("/send", async (req, res) => {
    const { to, message, botId = "default" } = req.body;
    if (!to || !message) {
      return res.status(400).send({ message: "Invalid request" });
    }

    try {
      const sock = botManager.getSock(botId);
      if (!sock || !sock.user) {
        return res.status(500).send({ message: `Bot ${botId} is not connected` });
      }

      if (Array.isArray(to)) {
        const jids = await Promise.all(to.map((r) => normalizeJID(sock, r)));
        await Promise.all(
          jids.map((jid) =>
            messageQueue.enqueue(jid, () => sock.sendMessage(jid, { text: message }), 0),
          ),
        );
        console.log("Message queued for multiple recipients via bot", botId);
        return res.send({ message: "Messages queued", botId });
      } else {
        const recipientJid = await normalizeJID(sock, to);
        await messageQueue.enqueue(
          recipientJid,
          () => sock.sendMessage(recipientJid, { text: message }),
          0,
        );
        console.log("Message queued for:", to, "via bot", botId);
        return res.send({ message: "Message queued", botId });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      return res.status(500).send({ message: "Failed to send message" });
    }
  });
}

process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection at: ", p, "reason:", reason);
});

process.on("uncaughtException", function (err) {
  console.error("Uncaught Exception:", err);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

function gracefulShutdown(signal) {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
  try {
    for (const botId of botManager.getBotIds()) {
      try {
        const sock = botManager.getSock(botId);
        if (sock) sock.end(undefined);
      } catch (err) {
        console.error(`Error ending socket for bot ${botId}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Error ending WA sockets during shutdown:", err.message);
  }
  server.close(() => {
    console.log("✅ HTTP server closed");
    wss.clients.forEach((client) => client.close());
    console.log("✅ Graceful shutdown completed");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("❌ Forced shutdown due to timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
