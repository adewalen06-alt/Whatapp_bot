/**
 * Topai WhatsApp Bot - Multi-User Server
 * Supports multiple WhatsApp sessions via web UI
 * HuggingFace Spaces compatible (port 7860)
 */

process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const config = require('./config');
const handler = require('./handler');

const app = express();
const PORT = process.env.PORT || 7860;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Session Store ──────────────────────────────────────────────────────────
// Map<phoneNumber, { sock, status, qr, pairCode, qrBase64, reconnectTimer }>
const sessions = new Map();

// ─── Silent Pino Logger ──────────────────────────────────────────────────────
const silentLogger = pino({ level: 'silent' });

// ─── Session Folder Helper ────────────────────────────────────────────────────
function sessionDir(phone) {
  const dir = path.join(__dirname, 'sessions', phone);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── SSE Clients ─────────────────────────────────────────────────────────────
const sseClients = new Map(); // Map<phone, Set<res>>

function broadcastToPhone(phone, data) {
  const clients = sseClients.get(phone);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch (_) {}
  }
}

// ─── Start Bot Session ────────────────────────────────────────────────────────
async function startSession(phone, method = 'qr') {
  // Clean phone number (digits only)
  const cleanPhone = phone.replace(/\D/g, '');

  if (sessions.has(cleanPhone)) {
    const existing = sessions.get(cleanPhone);
    if (existing.status === 'connected') {
      return { success: false, error: 'Already connected' };
    }
    // Close existing socket if any
    try { existing.sock?.end?.(); } catch (_) {}
    sessions.delete(cleanPhone);
  }

  const sessionData = {
    status: 'connecting',
    qr: null,
    qrBase64: null,
    pairCode: null,
    sock: null,
    reconnectTimer: null
  };
  sessions.set(cleanPhone, sessionData);

  try {
    const dir = sessionDir(cleanPhone);
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();

    const usePairCode = method === 'pair';

    const sock = makeWASocket({
      version,
      logger: silentLogger,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      auth: state,
      syncFullHistory: false,
      downloadHistory: false,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined
    });

    sessionData.sock = sock;

    // Request pair code when socket is ready (not yet registered)
    let pairCodeRequested = false;
    if (usePairCode && !state.creds.registered) {
      const requestCode = async () => {
        if (pairCodeRequested) return;
        pairCodeRequested = true;
        try {
          const code = await sock.requestPairingCode(cleanPhone);
          const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
          sessionData.pairCode = formatted;
          sessionData.status = 'awaiting_pair';
          broadcastToPhone(cleanPhone, { status: 'pair_code', pairCode: formatted });
        } catch (err) {
          // Retry once after 3 seconds
          pairCodeRequested = false;
          setTimeout(async () => {
            if (pairCodeRequested) return;
            pairCodeRequested = true;
            try {
              const code = await sock.requestPairingCode(cleanPhone);
              const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
              sessionData.pairCode = formatted;
              sessionData.status = 'awaiting_pair';
              broadcastToPhone(cleanPhone, { status: 'pair_code', pairCode: formatted });
            } catch (err2) {
              sessionData.status = 'error';
              broadcastToPhone(cleanPhone, { status: 'error', error: 'Failed to get pair code. Try again.' });
            }
          }, 3000);
        }
      };
      // Wait 5 seconds for WebSocket to be ready (important on slow servers)
      setTimeout(requestCode, 5000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !usePairCode) {
        try {
          const qrBase64 = await QRCode.toDataURL(qr);
          sessionData.qr = qr;
          sessionData.qrBase64 = qrBase64;
          sessionData.status = 'awaiting_qr';
          broadcastToPhone(cleanPhone, { status: 'qr', qrBase64 });
        } catch (err) {
          console.error('QR gen error:', err.message);
        }
      }

      if (connection === 'open') {
        sessionData.status = 'connected';
        sessionData.qr = null;
        sessionData.qrBase64 = null;
        sessionData.pairCode = null;
        const botNumber = sock.user?.id?.split(':')[0] || cleanPhone;
        broadcastToPhone(cleanPhone, { status: 'connected', botNumber });
        console.log(`✅ [${cleanPhone}] Connected as ${botNumber}`);

        // Initialize anti-call
        try { handler.initializeAntiCall(sock); } catch (_) {}
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;

        if (loggedOut) {
          sessionData.status = 'logged_out';
          broadcastToPhone(cleanPhone, { status: 'logged_out' });
          // Remove session files
          try { fs.rmSync(sessionDir(cleanPhone), { recursive: true, force: true }); } catch (_) {}
          sessions.delete(cleanPhone);
        } else {
          sessionData.status = 'reconnecting';
          broadcastToPhone(cleanPhone, { status: 'reconnecting' });
          sessionData.reconnectTimer = setTimeout(() => startSession(cleanPhone, method), 4000);
        }
      }
    });

    // Message handler
    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || !msg.key?.id) continue;
        const from = msg.key.remoteJid;
        if (!from || from.includes('@broadcast') || from.includes('@newsletter')) continue;

        const msgAge = msg.messageTimestamp ? Date.now() - msg.messageTimestamp * 1000 : 0;
        if (msgAge > 5 * 60 * 1000) continue;

        handler.handleMessage(sock, msg).catch(err => {
          if (!err.message?.includes('rate-overlimit')) {
            console.error(`[${cleanPhone}] Handler error:`, err.message);
          }
        });
      }
    });

    // Group participant updates
    sock.ev.on('group-participants.update', async (update) => {
      try { await handler.handleGroupUpdate(sock, update); } catch (_) {}
    });

    return { success: true };
  } catch (err) {
    sessionData.status = 'error';
    broadcastToPhone(cleanPhone, { status: 'error', error: err.message });
    return { success: false, error: err.message };
  }
}

// ─── HTTP Routes ─────────────────────────────────────────────────────────────

// Serve web UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// List all active sessions
app.get('/api/sessions', (req, res) => {
  const list = [];
  for (const [phone, data] of sessions.entries()) {
    list.push({
      phone,
      status: data.status,
      hasPairCode: !!data.pairCode,
      hasQr: !!data.qrBase64
    });
  }
  res.json({ sessions: list });
});

// Connect a new phone
app.post('/api/connect', async (req, res) => {
  const { phone, method } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 7) return res.status(400).json({ error: 'Invalid phone number' });

  const result = await startSession(cleanPhone, method || 'qr');
  res.json(result);
});

// Get current status + QR/pairCode for a session
app.get('/api/status/:phone', (req, res) => {
  const phone = req.params.phone.replace(/\D/g, '');
  const data = sessions.get(phone);
  if (!data) return res.json({ status: 'not_found' });

  res.json({
    status: data.status,
    pairCode: data.pairCode || null,
    qrBase64: data.qrBase64 || null
  });
});

// Disconnect a session
app.post('/api/disconnect/:phone', async (req, res) => {
  const phone = req.params.phone.replace(/\D/g, '');
  const data = sessions.get(phone);
  if (!data) return res.json({ success: false, error: 'Session not found' });

  try {
    clearTimeout(data.reconnectTimer);
    data.sock?.end?.();
  } catch (_) {}
  sessions.delete(phone);
  broadcastToPhone(phone, { status: 'disconnected' });
  res.json({ success: true });
});

// Server-Sent Events for real-time updates
app.get('/api/events/:phone', (req, res) => {
  const phone = req.params.phone.replace(/\D/g, '');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!sseClients.has(phone)) sseClients.set(phone, new Set());
  sseClients.get(phone).add(res);

  // Send current state immediately
  const data = sessions.get(phone);
  if (data) {
    res.write(`data: ${JSON.stringify({
      status: data.status,
      pairCode: data.pairCode || null,
      qrBase64: data.qrBase64 || null
    })}\n\n`);
  }

  req.on('close', () => {
    sseClients.get(phone)?.delete(res);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, sessions: sessions.size, uptime: process.uptime() });
});

// ─── Auto-restore sessions from disk ─────────────────────────────────────────
async function restorePersistedSessions() {
  const sessionsDir = path.join(__dirname, 'sessions');
  if (!fs.existsSync(sessionsDir)) return;

  const phones = fs.readdirSync(sessionsDir).filter(f => {
    const credsPath = path.join(sessionsDir, f, 'creds.json');
    return fs.existsSync(credsPath);
  });

  for (const phone of phones) {
    console.log(`♻️  Restoring session for ${phone}...`);
    await startSession(phone, 'qr');
  }

  if (phones.length > 0) {
    console.log(`✅ Restored ${phones.length} session(s)`);
  }
}

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 Topai WhatsApp Bot Server running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}\n`);
  await restorePersistedSessions();
});

process.on('uncaughtException', (err) => {
  if (err.code === 'ENOSPC') {
    console.error('⚠️ Disk full — cleanup needed');
    return;
  }
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (err) => {
  if (err?.message?.includes('rate-overlimit')) return;
  console.error('Unhandled Rejection:', err?.message || err);
});
