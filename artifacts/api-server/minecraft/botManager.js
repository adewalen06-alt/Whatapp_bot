const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const HumanBehavior = require('./humanBehavior');

const bots = new Map();
const sseClients = new Map();

const BAN_KEYWORDS = ['banned', 'ban', 'permanently', 'suspended', 'blacklist', 'not allowed'];
const SPAWN_TIMEOUT_MS = 30000; // 30s — if spawn doesn't fire, report error

function broadcast(serverId, data) {
  const clients = sseClients.get(serverId);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch (_) {}
  }
}

function log(serverId, message, type = 'info') {
  const entry = { time: new Date().toISOString(), message, type };
  const inst = bots.get(serverId);
  if (inst) {
    if (!inst.logs) inst.logs = [];
    inst.logs.push(entry);
    if (inst.logs.length > 200) inst.logs.shift();
  }
  broadcast(serverId, { event: 'log', ...entry });
}

function _spawnBot(inst) {
  const { config, accountList } = inst;
  const username = accountList[inst.currentAccountIndex % accountList.length];
  inst.status = 'connecting';

  log(inst.serverId, `🔄 Connecting to ${config.host}:${config.port || 25565} as ${username}...`, 'info');
  broadcast(inst.serverId, { event: 'status', status: 'connecting', username });

  let bot;
  try {
    bot = mineflayer.createBot({
      host: config.host,
      port: parseInt(config.port) || 25565,
      username,
      version: config.version || false,
      auth: config.auth || 'offline',
      checkTimeoutInterval: 120000, // 2 min — tolerates slow/sleeping servers (e.g. Aternos)
      keepAlive: true,
      hideErrors: false
    });
  } catch (err) {
    inst.status = 'error';
    log(inst.serverId, `❌ Failed to create bot: ${err.message}`, 'error');
    broadcast(inst.serverId, { event: 'status', status: 'error', error: err.message });
    return;
  }

  inst.bot = bot;

  // ── Spawn timeout ─────────────────────────────────────────────────────────
  const spawnTimeout = setTimeout(() => {
    if (inst.status !== 'connected') {
      inst.autoReconnect = false; // stop reconnect loop BEFORE bot.end()
      inst.status = 'error';
      log(inst.serverId, `⏱️ Timed out — no response from server after 30s`, 'error');
      log(inst.serverId, `   • Wrong host/port?`, 'error');
      log(inst.serverId, `   • Online-mode server requiring Microsoft auth?`, 'error');
      log(inst.serverId, `   • MC Version mismatch? Try setting it manually (e.g. 1.21.1)`, 'error');
      log(inst.serverId, `🛑 Reconnect stopped. Fix the issue and try again.`, 'warn');
      broadcast(inst.serverId, { event: 'status', status: 'error', error: 'Timed out after 30s' });
      try { bot.end(); } catch (_) {}
    }
  }, SPAWN_TIMEOUT_MS);

  try { bot.loadPlugin(pathfinder); } catch (_) {}

  const human = new HumanBehavior(bot, inst.serverId, log);
  inst.human = human;

  bot.once('spawn', () => {
    clearTimeout(spawnTimeout);
    inst.status = 'connected';
    inst._wasEverConnected = true; // used to distinguish network blips from auth rejections
    inst.reconnectAttempts = 0;
    inst._tickCount = 0;

    try {
      const movements = new Movements(bot);
      movements.canDig = true;
      movements.allowSprinting = true;
      bot.pathfinder.setMovements(movements);
    } catch (e) {
      log(inst.serverId, `⚠️ Pathfinder setup warning: ${e.message}`, 'warn');
    }

    log(inst.serverId, `✅ Spawned in world as ${username}`, 'success');
    log(inst.serverId, `💡 Use the Tasks button to give the bot something to do`, 'info');
    broadcast(inst.serverId, {
      event: 'status', status: 'connected',
      username, position: bot.entity?.position
    });

    human.startIdleBehavior();
  });

  bot.on('health', () => {
    inst.health = bot.health;
    inst.food = bot.food;
    broadcast(inst.serverId, { event: 'stats', health: bot.health, food: bot.food });
  });

  bot.on('physicsTick', () => {
    if (!bot.entity) return;
    inst.position = bot.entity.position;
    inst._tickCount = (inst._tickCount || 0) + 1;
    if (inst._tickCount % 20 === 0) {
      broadcast(inst.serverId, { event: 'position', position: bot.entity.position });
    }
  });

  bot.on('chat', (user, message) => {
    log(inst.serverId, `💬 <${user}> ${message}`, 'chat');
  });

  bot.on('kicked', (reason) => {
    clearTimeout(spawnTimeout);
    inst.human?.stopAll();

    // Parse Minecraft JSON kick reason (handles chat JSON + NBT compound format)
    let reasonStr = String(reason || '');
    try {
      const parsed = typeof reason === 'string' ? JSON.parse(reason) : reason;

      // Recursively extract text from chat JSON or prismarine-nbt compound
      const extractText = (obj) => {
        if (!obj) return '';
        if (typeof obj === 'string') return obj;
        // prismarine-nbt compound: { type: 'compound', value: { text: { type:'string', value:'...' }, ... } }
        if (obj.type === 'compound' && obj.value) {
          const v = obj.value;
          return extractText(v.text?.value || v.translate?.value || '') +
            (v.extra?.value ? v.extra.value.map(extractText).join('') : '') +
            (v.with?.value ? ' ' + v.with.value.map(extractText).join(', ') : '');
        }
        // prismarine-nbt primitive: { type: 'string', value: '...' }
        if (obj.type && obj.value !== undefined && typeof obj.value !== 'object') {
          return String(obj.value);
        }
        // Standard Minecraft chat JSON
        let t = obj.text || obj.translate || '';
        if (obj.extra) t += obj.extra.map(extractText).join('');
        if (obj.with) t += ' ' + obj.with.map(extractText).join(', ');
        return t.trim();
      };

      reasonStr = extractText(parsed) || JSON.stringify(parsed);
    } catch (_) {}

    const isEmpty = !reasonStr || reasonStr === '{}' || reasonStr === '{"text":""}';
    if (isEmpty) {
      // Aternos / free-host servers kick bots when the server goes to sleep
      inst._sleepKicks = (inst._sleepKicks || 0) + 1;
      log(inst.serverId, `⚡ Kicked — server may be sleeping (Aternos/free host). Attempt #${inst._sleepKicks}`, 'warn');
      if (inst._sleepKicks >= 3) {
        log(inst.serverId, `😴 Server keeps sleeping — will wait 2 min before next reconnect attempt`, 'warn');
        inst._longSleepWait = true;
      }
    } else {
      inst._sleepKicks = 0;
      inst._longSleepWait = false;
      log(inst.serverId, `⚡ Kicked: ${reasonStr}`, 'warn');

      // Common kick hints
      if (reasonStr.toLowerCase().includes('internal error')) {
        log(inst.serverId, `💡 Hint: "Internal error" often means MC version mismatch — set the exact version in the form (e.g. 1.20.1, 1.21.1)`, 'info');
      }
      if (reasonStr.toLowerCase().includes('outdated') || reasonStr.toLowerCase().includes('update')) {
        log(inst.serverId, `💡 Hint: Server version mismatch — check what version the server is running and set it in the MC Version field`, 'info');
      }
      if (reasonStr.toLowerCase().includes('whitelist')) {
        log(inst.serverId, `💡 Hint: Ask the server admin to whitelist username: ${username}`, 'info');
      }

      const isBanned = BAN_KEYWORDS.some(kw => reasonStr.toLowerCase().includes(kw));
      if (isBanned && accountList.length > 1) {
        inst.currentAccountIndex = (inst.currentAccountIndex + 1) % accountList.length;
        const nextUser = accountList[inst.currentAccountIndex];
        log(inst.serverId, `🔄 Ban detected — switching account → ${nextUser}`, 'warn');
        broadcast(inst.serverId, { event: 'banned', nextAccount: nextUser });
      }
    }
  });

  bot.on('error', (err) => {
    clearTimeout(spawnTimeout);
    // Safely extract message — err can be Error, string, or object
    const msg = (err?.message || err?.code || (typeof err === 'string' ? err : '') || 'unknown error').trim();

    if (msg.includes('ECONNREFUSED')) {
      log(inst.serverId, `❌ Server refused connection — is the server online? Check host/port.`, 'error');
    } else if (msg.includes('ENOTFOUND') || msg.includes('ENOENT')) {
      log(inst.serverId, `❌ Server address not found — check the hostname spelling.`, 'error');
      inst.autoReconnect = false;
      inst.status = 'error';
      broadcast(inst.serverId, { event: 'status', status: 'error', error: msg });
      log(inst.serverId, `🛑 Reconnect stopped — fix the hostname and try again.`, 'warn');
      return;
    } else if (msg.includes('ETIMEDOUT') || msg.includes('timed out')) {
      log(inst.serverId, `❌ Connection timed out — server may be sleeping or offline.`, 'error');
    } else if (msg.includes('ECONNRESET')) {
      if (!inst._wasEverConnected) {
        // Never connected = server is rejecting our auth/version
        log(inst.serverId, `❌ Server reset connection — likely causes:`, 'error');
        log(inst.serverId, `   • Server is online-mode → switch Auth Mode to "Microsoft"`, 'error');
        log(inst.serverId, `   • Username not whitelisted on this server`, 'error');
        log(inst.serverId, `   • MC Version mismatch — try setting version manually (e.g. 1.21.1)`, 'error');
        inst.autoReconnect = false;
        inst.status = 'error';
        broadcast(inst.serverId, { event: 'status', status: 'error', error: msg });
        log(inst.serverId, `🛑 Reconnect stopped — fix the issue and try again.`, 'warn');
        return;
      } else {
        log(inst.serverId, `❌ Connection dropped (ECONNRESET) — will reconnect...`, 'error');
      }
    } else if (msg) {
      log(inst.serverId, `❌ Error: ${msg}`, 'error');
    }
    // For recoverable errors, don't change status — let end event handle reconnect
  });

  bot.on('end', (reason) => {
    clearTimeout(spawnTimeout);
    inst.human?.stopAll();
    const wasConnected = inst.status === 'connected';
    inst.status = 'disconnected';

    if (inst.autoReconnect === false) return; // already handled by error handler
    if (inst.status === 'error') return;

    // socketClosed / close BEFORE ever spawning = server is rejecting us
    if (!inst._wasEverConnected && (reason === 'socketClosed' || reason === 'close')) {
      inst.autoReconnect = false;
      inst.status = 'error';
      log(inst.serverId, `❌ Server closed connection before login — likely causes:`, 'error');
      log(inst.serverId, `   • Server is online-mode → change Auth Mode to "Microsoft"`, 'error');
      log(inst.serverId, `   • Username not whitelisted on this server`, 'error');
      log(inst.serverId, `   • MC Version mismatch — try setting it manually (e.g. 1.21.1)`, 'error');
      log(inst.serverId, `🛑 Reconnect stopped. Fix the issue and reconnect manually.`, 'warn');
      broadcast(inst.serverId, { event: 'status', status: 'error', error: 'Server rejected connection' });
      return;
    }

    if (wasConnected) {
      log(inst.serverId, `🔌 Lost connection to server`, 'warn');
    } else if (reason === 'keepAliveError') {
      log(inst.serverId, `🔌 Keep-alive timeout — server was unresponsive`, 'warn');
    } else if (reason && reason !== 'socketClosed' && reason !== 'disconnect.quitting') {
      log(inst.serverId, `🔌 Disconnected: ${reason}`, 'warn');
    }

    broadcast(inst.serverId, { event: 'status', status: 'disconnected' });

    if (inst.autoReconnect !== false) {
      // Use longer delay if server keeps sleeping (Aternos pattern)
      let delay;
      if (inst._longSleepWait) {
        delay = 120000; // 2 min — let the Aternos server wake up
        inst._longSleepWait = false;
      } else {
        delay = Math.min(5000 * Math.pow(1.5, inst.reconnectAttempts || 0), 60000);
      }
      inst.reconnectAttempts = (inst.reconnectAttempts || 0) + 1;
      const delaySec = Math.round(delay / 1000);
      log(inst.serverId, `♻️ Reconnecting in ${delaySec}s (attempt #${inst.reconnectAttempts})...`, 'info');
      broadcast(inst.serverId, { event: 'status', status: 'reconnecting', delaySec });
      inst.reconnectTimer = setTimeout(() => _spawnBot(inst), delay);
    }
  });
}

async function createBot(config) {
  const { serverId, host, username, accounts } = config;
  if (!serverId || !host || !username) {
    return { success: false, error: 'serverId, host, and username are required' };
  }

  if (bots.has(serverId)) {
    const existing = bots.get(serverId);
    if (existing.status === 'connected') return { success: false, error: 'Already connected' };
    await destroyBot(serverId);
  }

  const accountList = (accounts && accounts.length) ? accounts : [username];

  const inst = {
    serverId, config,
    bot: null,
    status: 'connecting',
    accountList,
    currentAccountIndex: 0,
    reconnectTimer: null,
    reconnectAttempts: 0,
    autoReconnect: true,
    task: null,
    logs: [],
    position: null,
    health: 20,
    food: 20,
    human: null,
    _tickCount: 0
  };

  bots.set(serverId, inst);
  _spawnBot(inst);
  return { success: true };
}

async function destroyBot(serverId) {
  const inst = bots.get(serverId);
  if (!inst) return;
  inst.autoReconnect = false;
  clearTimeout(inst.reconnectTimer);
  inst.human?.stopAll();
  try { inst.bot?.end(); } catch (_) {}
  bots.delete(serverId);
  broadcast(serverId, { event: 'status', status: 'stopped' });
}

async function sendChat(serverId, message) {
  const inst = bots.get(serverId);
  if (!inst?.bot || inst.status !== 'connected') return { success: false, error: 'Bot not connected' };
  try {
    inst.bot.chat(message);
    log(serverId, `📤 > ${message}`, 'info');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function setTask(serverId, task) {
  const inst = bots.get(serverId);
  if (!inst?.bot || inst.status !== 'connected') return { success: false, error: 'Bot not connected' };

  inst.human?.stopTask();
  inst.task = task;
  broadcast(serverId, { event: 'task', task });

  (async () => {
    try {
      switch (task.type) {
        case 'goto':
          await inst.human.goTo(parseFloat(task.x), parseFloat(task.y), parseFloat(task.z));
          break;
        case 'mine':
          await inst.human.mineBlock(task.block, parseInt(task.count) || 64);
          break;
        case 'craft':
          await inst.human.craftItem(task.item, parseInt(task.count) || 1);
          break;
        case 'idle':
          log(serverId, '😴 Bot set to idle mode', 'info');
          break;
        default:
          log(serverId, `❓ Unknown task: ${task.type}`, 'warn');
      }
      inst.task = null;
      broadcast(serverId, { event: 'task', task: null });
    } catch (err) {
      log(serverId, `❌ Task failed: ${err.message}`, 'error');
      inst.task = null;
      broadcast(serverId, { event: 'task', task: null });
    }
  })();

  return { success: true };
}

function getStatus(serverId) {
  const inst = bots.get(serverId);
  if (!inst) return null;
  return {
    serverId: inst.serverId,
    host: inst.config.host,
    port: inst.config.port || 25565,
    status: inst.status,
    username: inst.accountList[inst.currentAccountIndex % inst.accountList.length],
    accounts: inst.accountList,
    position: inst.position,
    health: inst.health,
    food: inst.food,
    task: inst.task,
    reconnectAttempts: inst.reconnectAttempts,
    logs: (inst.logs || []).slice(-80)
  };
}

function getAllBots() {
  const result = [];
  for (const [id, inst] of bots.entries()) {
    result.push({
      serverId: id,
      host: inst.config.host,
      port: inst.config.port || 25565,
      status: inst.status,
      username: inst.accountList[inst.currentAccountIndex % inst.accountList.length],
      health: inst.health,
      food: inst.food,
      task: inst.task
    });
  }
  return result;
}

module.exports = { createBot, destroyBot, sendChat, setTask, getStatus, getAllBots, sseClients, bots, log };
