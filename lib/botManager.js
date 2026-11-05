const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const store = require('./lightweight_store');
const PhoneNumber = require('awesome-phonenumber');
const { smsg } = require('../lib/myfunc');

function normalizePhoneNumber(phoneNumber) {
    return String(phoneNumber ?? '').replace(/\D/g, '');
}

function formatPairingCode(code) {
    const normalized = String(code ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return normalized ? `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}` : '';
}

async function waitForSocket(socket, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (socket?.ws?.readyState === 1) return;
        await delay(100);
    }
    throw new Error('WhatsApp socket is not ready. Please try again.');
}

async function waitForConnectionReady(socket, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeoutMs;
        const checkConnection = () => {
            if (socket?.ws?.readyState === 1 && socket?.authState?.creds?.registered !== undefined) {
                resolve();
            } else if (Date.now() > deadline) {
                reject(new Error('Connection not ready in time'));
            } else {
                setTimeout(checkConnection, 200);
            }
        };
        checkConnection();
    });
}

let messageHandlers = {
    handleMessages: null,
    handleGroupParticipantUpdate: null,
    handleStatus: null,
    handleAntibotDetection: null
};

function setMessageHandlers(handlers) {
    messageHandlers = { ...messageHandlers, ...handlers };
}

const SESSIONS_DIR = './sessions';
const BOT_CONFIG_FILE = './data/bot_sessions.json';

class BotSession extends EventEmitter {
    constructor(number, name, isOwner = false) {
        super();
        this.number = number;
        this.name = name;
        this.isOwner = isOwner;
        this.sock = null;
        this.sessionPath = path.join(SESSIONS_DIR, number);
        this.status = 'stopped';
        this.qrCode = null;
        this.pairCode = null;
        this.pairingPhoneNumber = null;
        this.user = null;
        this.startTime = null;
        this.error = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 50;
        this.reconnectDelay = 5000;
        this.maxReconnectDelay = 60000;
        this.keepAliveInterval = null;
        this.lastActivity = Date.now();
        this.connectionMonitor = null;
    }

    async start() {
        if (this.status === 'connected' || this.status === 'starting' || (this.status === 'connecting' && this.sock)) {
            return { success: false, message: `Bot already ${this.status}` };
        }

        await this.ensureSocket();
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({ success: false, message: 'Connection timeout' });
            }, 90000);

            const onConnectionUpdate = (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    this.qrCode = qr;
                    this.pairCode = null;
                    this.emit('qr', qr);
                    this.emit('statusChange', this.getStatus());
                }

                if (connection === 'open') {
                    clearTimeout(timeout);
                    this.sock.ev.off('connection.update', onConnectionUpdate);
                    this.onConnected();
                    resolve({ success: true, message: 'Connected' });
                } else if (connection === 'close') {
                    const isLoggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
                    const isConflict = lastDisconnect?.error?.output?.statusCode === DisconnectReason.connectionReplaced;

                    if (isLoggedOut) {
                        clearTimeout(timeout);
                        this.sock.ev.off('connection.update', onConnectionUpdate);
                        this.onLoggedOut();
                        resolve({ success: false, message: 'Logged out' });
                    } else if (!isConflict) {
                        this.scheduleReconnect();
                    }
                }
            };

            this.sock.ev.on('connection.update', onConnectionUpdate);
        });
    }

    setupEventHandlers() {
        this.sock.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    if (messageHandlers.handleStatus) {
                        await messageHandlers.handleStatus(this.sock, chatUpdate);
                    }
                    return;
                }
                if (mek.key?.remoteJid?.endsWith('@g.us') && !mek.key.fromMe) {
                    if (messageHandlers.handleAntibotDetection) {
                        try {
                            await messageHandlers.handleAntibotDetection(this.sock, mek);
                        } catch (abErr) {
                            console.error('[antibot] upsert hook:', abErr?.message || abErr);
                        }
                    }
                }
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;

                if (messageHandlers.handleMessages) {
                    try {
                        await messageHandlers.handleMessages(this.sock, chatUpdate, true);
                    } catch (err) {
                        console.error("Error in handleMessages:", err);
                    }
                }
            } catch (err) {
                console.error("Error in messages.upsert:", err);
            }
        });

        this.sock.ev.on('group-participants.update', async (update) => {
            if (messageHandlers.handleGroupParticipantUpdate) {
                await messageHandlers.handleGroupParticipantUpdate(this.sock, update);
            }
        });

        this.sock.ev.on('status.update', async (status) => {
            if (messageHandlers.handleStatus) {
                await messageHandlers.handleStatus(this.sock, status);
            }
        });

        this.sock.ev.on('connection.update', (update) => {
            if (update.connection === 'open') {
                this.lastActivity = Date.now();
            }
        });
    }

    startKeepAlive() {
        if (this.keepAliveInterval) return;
        
        this.keepAliveInterval = setInterval(async () => {
            if (!this.sock || this.status !== 'connected') {
                this.stopKeepAlive();
                return;
            }

            try {
                const now = Date.now();
                if (now - this.lastActivity > 120000) {
                    await this.sock.sendPresenceUpdate('available');
                    this.lastActivity = now;
                }

                if (this.sock.ws?.readyState !== 1) {
                    console.log(`[${this.number}] WebSocket disconnected, triggering reconnect`);
                    this.scheduleReconnect();
                }
            } catch (e) {
                console.error(`[${this.number}] Keep-alive error:`, e.message);
            }
        }, 30000);
    }

    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }

    startConnectionMonitor() {
        if (this.connectionMonitor) return;
        
        this.connectionMonitor = setInterval(() => {
            if (this.status === 'connected' && this.sock) {
                if (this.sock.ws?.readyState !== 1) {
                    console.log(`[${this.number}] Connection monitor detected disconnect`);
                    this.scheduleReconnect();
                }
            }
        }, 15000);
    }

    stopConnectionMonitor() {
        if (this.connectionMonitor) {
            clearInterval(this.connectionMonitor);
            this.connectionMonitor = null;
        }
    }

    onConnected() {
        this.status = 'connected';
        this.user = this.sock.user;
        this.startTime = Date.now();
        this.reconnectAttempts = 0;
        this.reconnectDelay = 5000;
        this.qrCode = null;
        this.pairCode = null;
        this.pairingPhoneNumber = null;
        this.lastActivity = Date.now();
        this.emit('connected', this.sock);
        this.emit('statusChange', this.getStatus());
        this.startKeepAlive();
        this.startConnectionMonitor();
        console.log(`✅ Bot ${this.number} connected as ${this.sock.user?.name || this.sock.user?.id}`);
    }

    onLoggedOut() {
        this.status = 'stopped';
        this.user = null;
        this.qrCode = null;
        this.pairCode = null;
        this.pairingPhoneNumber = null;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 5000;
        this.stopKeepAlive();
        this.stopConnectionMonitor();
        this.sock = null;
        if (fs.existsSync(this.sessionPath)) {
            fs.rmSync(this.sessionPath, { recursive: true, force: true });
        }
        this.emit('statusChange', this.getStatus());
        console.log(`❌ Bot ${this.number} logged out. Session credentials cleared; pair it again from the admin panel.`);
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.status = 'error';
            this.error = 'Max reconnect attempts reached';
            this.emit('statusChange', this.getStatus());
            this.stopKeepAlive();
            this.stopConnectionMonitor();
            return;
        }
        this.reconnectAttempts++;
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
        console.log(`🔄 Bot ${this.number} reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`);

        if (this.sock) {
            this.sock.ev.removeAllListeners();
            this.sock.ws?.close();
            this.sock = null;
        }
        this.status = 'reconnecting';
        this.emit('statusChange', this.getStatus());
        this.stopKeepAlive();
        this.stopConnectionMonitor();
        setTimeout(() => this.start(), this.reconnectDelay);
    }

    async requestPairCode(phoneNumber) {
        if (this.sock?.user || this.sock?.authState?.creds?.registered) {
            throw new Error('Already connected');
        }
        if (!this.sock) throw new Error('Socket not initialized');

        const normalizedNumber = normalizePhoneNumber(phoneNumber);
        if (normalizedNumber.length < 7 || normalizedNumber.length > 15) {
            throw new Error('Enter a valid phone number with its country code (digits only)');
        }

        if (this.pairCode && this.pairingPhoneNumber === normalizedNumber) {
            return this.pairCode;
        }

        // Fast retry with shorter delays
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await waitForSocket(this.sock);
                const code = await this.sock.requestPairingCode(normalizedNumber);
                this.pairCode = formatPairingCode(code);
                this.pairingPhoneNumber = normalizedNumber;
                this.qrCode = null;
                this.emit('pairCode', this.pairCode);
                this.emit('statusChange', this.getStatus());
                return this.pairCode;
            } catch (e) {
                console.log(`[${this.number}] Pair code attempt ${attempt} failed:`, e.message);
                if (attempt < 3) {
                    await delay(1000 * attempt); // 1s, 2s
                }
            }
        }
        throw new Error('Failed to generate pair code after 3 attempts. Please try again.');
    }

    async logout() {
        if (this.sock) {
            await this.sock.logout();
        }
        this.sock = null;
        this.status = 'stopped';
        this.user = null;
        this.stopKeepAlive();
        this.stopConnectionMonitor();
        this.emit('statusChange', this.getStatus());
    }

    async stop() {
        if (this.sock) {
            this.sock.ev.removeAllListeners();
            this.sock.ws?.close();
            this.sock = null;
        }
        this.status = 'stopped';
        this.user = null;
        this.qrCode = null;
        this.pairCode = null;
        this.pairingPhoneNumber = null;
        this.stopKeepAlive();
        this.stopConnectionMonitor();
        this.emit('statusChange', this.getStatus());
    }

    async refreshQR() {
        if (this.sock) {
            this.sock.ev.removeAllListeners();
            this.sock.ws?.close();
            this.sock = null;
        }
        this.status = 'stopped';
        this.qrCode = null;
        this.pairCode = null;
        this.pairingPhoneNumber = null;
        this.stopKeepAlive();
        this.stopConnectionMonitor();
        this.emit('statusChange', this.getStatus());
        return this.start();
    }

    async ensureSocket() {
        if (this.sock) return;
        
        if (!fs.existsSync(this.sessionPath)) {
            fs.mkdirSync(this.sessionPath, { recursive: true });
        }

        const credsPath = path.join(this.sessionPath, 'creds.json');
        if (fs.existsSync(credsPath)) {
            try {
                const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                if (creds.registered !== true) {
                    fs.rmSync(this.sessionPath, { recursive: true, force: true });
                    fs.mkdirSync(this.sessionPath, { recursive: true });
                }
            } catch (e) {
                fs.rmSync(this.sessionPath, { recursive: true, force: true });
                fs.mkdirSync(this.sessionPath, { recursive: true });
            }
        }

        let { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

        this.sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                let jid = key.remoteJid;
                let msg = await store.loadMessage(jid, key.id);
                return msg?.message || "";
            },
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            maxMsgRetryCount: 5,
        });

        this.sock.ev.on('creds.update', saveCreds);
        store.bind(this.sock.ev);
        this.setupEventHandlers();
        this.status = 'connecting';
        this.emit('statusChange', this.getStatus());

        // Wait for socket to be ready (for faster pair code generation)
        try {
            await waitForSocket(this.sock, 15000);
        } catch (e) {
            console.log(`[${this.number}] Socket ready timeout, continuing anyway`);
        }
    }

    getStatus() {
        return {
            number: this.number,
            name: this.name,
            isOwner: this.isOwner,
            status: this.status,
            user: this.user ? {
                id: this.user.id,
                name: this.user.name,
                platform: this.user.platform
            } : null,
            qrCode: this.qrCode,
            pairCode: this.pairCode,
            error: this.error,
            uptime: this.startTime ? Date.now() - this.startTime : 0,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    getMemoryUsage() {
        if (!this.sock) return null;
        const mem = process.memoryUsage();
        return {
            rss: Math.round(mem.rss / 1024 / 1024),
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
        };
    }
}

class BotManager extends EventEmitter {
    constructor() {
        super();
        this.sessions = new Map();
        this.loadConfig();
        this.startAutoRecovery();
    }

    loadConfig() {
        try {
            if (fs.existsSync(BOT_CONFIG_FILE)) {
                const config = JSON.parse(fs.readFileSync(BOT_CONFIG_FILE, 'utf8'));
                for (const sessionConfig of config.sessions || []) {
                    this.createSession(sessionConfig.number, sessionConfig.name, sessionConfig.isOwner, false);
                }
            }
        } catch (e) {
            console.error('Error loading bot config:', e);
        }
    }

    saveConfig() {
        try {
            const sessions = Array.from(this.sessions.values()).map(s => ({
                number: s.number,
                name: s.name,
                isOwner: s.isOwner
            }));
            const dir = path.dirname(BOT_CONFIG_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(BOT_CONFIG_FILE, JSON.stringify({ sessions }, null, 2));
        } catch (e) {
            console.error('Error saving bot config:', e);
        }
    }

    createSession(number, name, isOwner = false, autoStart = true) {
        if (this.sessions.has(number)) {
            return this.sessions.get(number);
        }
        const session = new BotSession(number, name, isOwner);
        this.sessions.set(number, session);
        this.saveConfig();

        session.on('statusChange', (status) => {
            this.emit('sessionStatusChange', status);
        });
        session.on('connected', (sock) => {
            this.emit('sessionConnected', number, sock);
        });

        if (autoStart) {
            session.start();
        }
        return session;
    }

    getSession(number) {
        return this.sessions.get(number);
    }

    getAllSessions() {
        return Array.from(this.sessions.values()).map(s => s.getStatus());
    }

    async startSession(number) {
        const session = this.sessions.get(number);
        if (!session) return { success: false, message: 'Session not found' };
        return session.start();
    }

    async stopSession(number) {
        const session = this.sessions.get(number);
        if (!session) return { success: false, message: 'Session not found' };
        await session.stop();
        return { success: true };
    }

    async removeSession(number) {
        const session = this.sessions.get(number);
        if (!session) return { success: false, message: 'Session not found' };
        await session.stop();
        if (fs.existsSync(session.sessionPath)) {
            fs.rmSync(session.sessionPath, { recursive: true, force: true });
        }
        this.sessions.delete(number);
        this.saveConfig();
        return { success: true };
    }

    async requestPairCode(number, phoneNumber) {
        const session = this.sessions.get(number);
        if (!session) return { success: false, message: 'Session not found' };
        try {
            const code = await session.requestPairCode(phoneNumber);
            return { success: true, code };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    getOwnerSessions() {
        return Array.from(this.sessions.values())
            .filter(s => s.isOwner)
            .map(s => s.getStatus());
    }

    startAutoRecovery() {
        setInterval(() => {
            for (const [number, session] of this.sessions) {
                if (session.isOwner && session.status === 'stopped' && session.reconnectAttempts === 0) {
                    console.log(`[AutoRecovery] Restarting owner session ${number}`);
                    session.start().catch(e => console.error(`[AutoRecovery] Failed to restart ${number}:`, e.message));
                }
            }
        }, 60000);
    }
}

const botManager = new BotManager();

module.exports = { BotManager, BotSession, botManager, setMessageHandlers };