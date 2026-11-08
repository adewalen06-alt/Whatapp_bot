// Global singleton WebSocket manager.
// Single connection, distributes typed events to registered listeners.
// Re-exports nothing React-specific — plain JS module.

const listeners = new Map();

function emit(type, data) {
  listeners.get(type)?.forEach((fn) => fn(data));
}

export function addWsListener(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
}

export function removeWsListener(type, fn) {
  listeners.get(type)?.delete(fn);
}

let reconnectTimer = null;
let current = null;

// Per-bot status tracking: botId -> { status, botNumber }
const botInfo = new Map();

function connect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${proto}//${location.host}`);
  current = ws;

  ws.onopen = () => emit('_status', { status: 'connecting' });
  ws.onclose = () => {
    if (ws !== current) return; // replaced by reconnectWs(): don't schedule a second connection
    emit('_status', { status: 'disconnected' });
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 5000);
  };
  ws.onerror = () => emit('_status', { status: 'disconnected' });

  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);

      // Track per-bot status
      if (data.type === 'status' && data.botId) {
        const existing = botInfo.get(data.botId) || {};
        botInfo.set(data.botId, { ...existing, status: data.status });
        // Emit a combined status: connected if ANY bot is connected
        const anyConnected = [...botInfo.values()].some((b) => b.status === 'connected');
        emit('_status', { status: anyConnected ? 'connected' : 'disconnected' });
        // Also emit per-bot status for listeners that want it
        emit('_bot_status', { botId: data.botId, status: data.status });
      } else if (data.type === 'bots_snapshot') {
        // Initial snapshot: populate all bot info
        botInfo.clear();
        for (const b of data.bots || []) {
          botInfo.set(b.botId, {
            status: b.status,
            botNumber: b.botNumber?.[0] || null,
            myNumber: b.myNumber?.[0] || null,
          });
        }
        const anyConnected = [...botInfo.values()].some((b) => b.status === 'connected');
        emit('_status', { status: anyConnected ? 'connected' : 'disconnected' });
        emit('bots_snapshot', data);
      } else {
        if (data.type === 'status') {
          // Legacy single-bot status (no botId)
          emit('_status', { status: data.status === 'connected' ? 'connected' : 'disconnected' });
        }
        emit(data.type, data);
      }
    } catch {}
  };
}

// The server ties the socket to the login cookie at connect time, so call this after login/logout.
export function reconnectWs() {
  clearTimeout(reconnectTimer);
  const old = current;
  connect();
  old?.close();
}

export function getBotStatus(botId = 'default') {
  return botInfo.get(botId)?.status || 'disconnected';
}

export function getAllBotStatus() {
  return Object.fromEntries([...botInfo.entries()].map(([k, v]) => [k, v.status]));
}

export function getConnectedBots() {
  return [...botInfo.entries()]
    .filter(([, b]) => b.status === 'connected')
    .map(([botId, b]) => [botId, b.botNumber]);
}

connect();
