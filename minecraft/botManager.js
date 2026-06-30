const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const HumanBehavior = require('./humanBehavior');

const bots = new Map();
const sseClients = new Map();

const BAN_KEYWORDS = ['banned', 'ban', 'permanently', 'suspended', 'blacklist', 'not allowed'];

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

  try {
    const bot = mineflayer.createBot({
      host: config.host,
      port: parseInt(config.port) || 25565,
      username,
      version: config.version || false,
      auth: config.auth || 'offline',
      checkTimeoutInterval: 60000,
      keepAlive: true,
      hideErrors: true
    });

    inst.bot = bot;
    bot.loadPlugin(pathfinder);

    const human = new HumanBehavior(bot, inst.serverId, log);
    inst.human = human;

    bot.once('spawn', () => {
      inst.status = 'connected';
      inst.reconnectAttempts = 0;
      inst._tickCount = 0;

      try {
        const movements = new Movements(bot);
        movements.canDig = true;
        movements.allowSprinting = true;
        bot.pathfinder.setMovements(movements);
      } catch (_) {}

      log(inst.serverId, `✅ Connected as ${username} to ${config.host}:${config.port || 25565}`, 'success');
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
      const reasonStr = typeof reason === 'string' ? reason : JSON.stringify(reason);
      log(inst.serverId, `⚡ Kicked: ${reasonStr}`, 'warn');
      inst.human?.stopAll();

      const isBanned = BAN_KEYWORDS.some(kw => reasonStr.toLowerCase().includes(kw));
      if (isBanned && accountList.length > 1) {
        inst.currentAccountIndex = (inst.currentAccountIndex + 1) % accountList.length;
        const nextUser = accountList[inst.currentAccountIndex];
        log(inst.serverId, `🔄 Ban detected! Switching to: ${nextUser}`, 'warn');
        broadcast(inst.serverId, { event: 'banned', nextAccount: nextUser });
      }
    });

    bot.on('error', (err) => {
      log(inst.serverId, `❌ ${err.message}`, 'error');
    });

    bot.on('end', (reason) => {
      inst.status = 'disconnected';
      inst.human?.stopAll();
      log(inst.serverId, `🔌 Disconnected: ${reason || 'connection closed'}`, 'warn');
      broadcast(inst.serverId, { event: 'status', status: 'disconnected' });

      if (inst.autoReconnect !== false) {
        const delay = Math.min(5000 * Math.pow(1.5, inst.reconnectAttempts), 60000);
        inst.reconnectAttempts = (inst.reconnectAttempts || 0) + 1;
        const delaySec = Math.round(delay / 1000);
        log(inst.serverId, `♻️ Reconnecting in ${delaySec}s (attempt #${inst.reconnectAttempts})`, 'info');
        broadcast(inst.serverId, { event: 'status', status: 'reconnecting', delaySec });
        inst.reconnectTimer = setTimeout(() => _spawnBot(inst), delay);
      }
    });

  } catch (err) {
    log(inst.serverId, `❌ Failed to create bot: ${err.message}`, 'error');
    inst.status = 'error';
    broadcast(inst.serverId, { event: 'status', status: 'error', error: err.message });
  }
}

async function createBot(config) {
  const { serverId, host, port, username, accounts, version, auth } = config;
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
  broadcast(serverId, { event: 'status', status: 'connecting', username: accountList[0] });
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

  // Run task async so HTTP response returns immediately
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
          log(serverId, '😴 Bot set to idle', 'info');
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
