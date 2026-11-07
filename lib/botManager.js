const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const store = require('./lightweight_store');
const settings = require('../settings');

function normalizePhoneNumber(phoneNumber) {
    return String(phoneNumber ?? '').replace(/\D/g, '');
}

function formatPairingCode(code) {
    const normalized = String(code ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return normalized ? `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}` : '';
}

// Resolve the version once per process; avoid a network lookup for every session.
let baileysVersionPromise;
async function getBaileysVersion() {
    if (!baileysVersionPromise) {
        baileysVersionPromise = fetchLatestBaileysVersion()
            .then(({ version }) => version)
            .catch((error) => {
                // Allow a later connection attempt to retry a failed lookup.
                baileysVersionPromise = null;
                throw error;
            });
    }
    return baileysVersionPromise;
}

async function waitForSocket(socket, timeoutMs = 90000) {
    if (!socket?.ws) throw new Error('WhatsApp socket has not been initialized.');
    if (socket.ws.readyState === 1) return;

    await new Promise((resolve, reject) => {
        const ws = socket.ws;
        let settled = false;
        let timeout;
        let poll;
        const cleanup = () => {
            clearTimeout(timeout);
            clearInterval(poll);
            ws.removeListener?.('open', onOpen);
            ws.removeListener?.('error', onError);
            ws.removeListener?.('close', onClose);
        };
        const finish = (error) => {
            if (settled) return;
            settled = true;
            cleanup();
            error ? reject(error) : resolve();
        };
        const onOpen = () => finish();
        const onError = (error) => finish(new Error(`WhatsApp WebSocket error: ${error?.message || 'connection failed'}`));
        const onClose = () => finish(new Error('WhatsApp WebSocket closed before it was ready. Restart the session and try again.'));
        timeout = setTimeout(() => finish(new Error('WhatsApp connection did not become ready within 90 seconds. Check Render logs and outbound network access.')), timeoutMs);
        poll = setInterval(() => {
            if (ws.readyState === 1) finish();
            else if (ws.readyState === 3) onClose();
        }, 500);
        ws.on?.('open', onOpen);
        ws.on?.('error', onError);
        ws.on?.('close', onClose);
        if (ws.readyState === 1) finish();
        else if (ws.readyState === 3) onClose();
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
const log = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'warn' });

class BotSession extends EventEmitter {
    constructor(number, name, isOwner = false) {
        super();
        this.number = number;
        this.name = name;
        this.isOwner = isOwner;
        this.sock = null;
        this.creds = null;
        this.sessionPath = path.join(SESSIONS_DIR, number);
        this.status = 'stopped';
        this.qrCode = null;
        this.pairCode = null;
        this.pairingPhoneNumber = null;
        this.pairingInProgress = false;
        this.user = null;
        this.startTime = null;
        this.error = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 50;
        this.reconnectDelay = 5000;
        this.maxReconnectDelay = 60000;
        this.keepAliveInterval = null;
        this.connectionMonitor = null;
        this.startingPromise = null;
        this.reconnectTimer = null;
        this.stopping = false;
    }

    // Start the socket only; pairing/QR must not wait for the user to finish linking.
    async start() {
        if (this.status === 'connected') return { success: true, message: 'Already connected' };
        if (this.sock) return { success: true, message: 'Connection is starting', session: this.getStatus() };
        if (this.startingPromise) return this.startingPromise;

        this.stopping = false;
        this.status = 'starting';
        this.error = null;
        this.emit('statusChange', this.getStatus());
        this.startingPromise = (async () => {
            try {
                await this.ensureSocket();
                return { success: true, message: 'Connection started', session: this.getStatus() };
            } catch (error) {
                this.status = 'error';
                this.error = error.message;
                this.sock = null;
                this.emit('statusChange', this.getStatus());
                return { success: false, message: error.message };
            } finally {
                this.startingPromise = null;
            }
        })();
        return this.startingPromise;
    }

    setupEventHandlers(socket) {
        socket.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const message = chatUpdate.messages?.[0];
                if (!message?.message) return;
                message.message = Object.keys(message.message)[0] === 'ephemeralMessage'
                    ? message.message.ephemeralMessage.message
                    : message.message;
                if (message.key?.remoteJid === 'status@broadcast') {
                    if (messageHandlers.handleStatus) await messageHandlers.handleStatus(socket, chatUpdate);
                    return;
                }
                if (message.key?.remoteJid?.endsWith('@g.us') && !message.key.fromMe && messageHandlers.handleAntibotDetection) {
                    try { await messageHandlers.handleAntibotDetection(socket, message); }
                    catch (error) { console.error('[antibot] upsert hook:', error?.message || error); }
                }
                if (message.key?.id?.startsWith('BAE5') && message.key.id.length === 16) return;
                if (messageHandlers.handleMessages) await messageHandlers.handleMessages(socket, chatUpdate, true);
            } catch (error) {
                console.error('Error in messages.upsert:', error?.message || error);
            }
        });

        socket.ev.on('group-participants.update', async (update) => {
            try { await messageHandlers.handleGroupParticipantUpdate?.(socket, update); }
            catch (error) { console.error('Error in group participant handler:', error?.message || error); }
        });
        socket.ev.on('status.update', async (status) => {
            try { await messageHandlers.handleStatus?.(socket, status); }
            catch (error) { console.error('Error in status handler:', error?.message || error); }
        });
        socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
            if (socket !== this.sock || this.stopping) return;
            if (qr) {
                this.qrCode = qr;
                this.pairCode = null;
                this.error = null;
                this.status = 'connecting';
                this.emit('qr', qr);
                this.emit('statusChange', this.getStatus());
            }
            if (connection === 'open') this.onConnected(socket);
            if (connection === 'close') {
                const error = lastDisconnect?.error;
                const statusCode = error?.output?.statusCode;
                this.error = error?.message || `WhatsApp connection closed${statusCode ? ` (status ${statusCode})` : ''}`;
                console.error(`[${this.number}] WhatsApp connection closed:`, this.error);
                if (statusCode === DisconnectReason.loggedOut) this.onLoggedOut();
                else if (statusCode !== DisconnectReason.connectionReplaced && !this.pairingInProgress) this.scheduleReconnect();
                else if (this.pairingInProgress) console.log(`[${this.number}] Pairing socket close ignored while requesting link code`);
            }
        });
    }

    startKeepAlive() {
        if (this.keepAliveInterval) return;
        this.keepAliveInterval = setInterval(async () => {
            if (!this.sock || this.status !== 'connected') return this.stopKeepAlive();
            try {
                if (Date.now() - this.lastActivity > 120000) {
                    await this.sock.sendPresenceUpdate('available');
                    this.lastActivity = Date.now();
                }

            } catch (error) {
                console.error(`[${this.number}] Keep-alive error:`, error.message);
            }
        }, 30000);
    }

    stopKeepAlive() {
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
    }

    startConnectionMonitor() {
        if (this.connectionMonitor) return;
        this.connectionMonitor = setInterval(() => {
            // Connection closes are handled by the real connection.update event.
        }, 15000);
    }

    stopConnectionMonitor() {
        if (this.connectionMonitor) clearInterval(this.connectionMonitor);
        this.connectionMonitor = null;
    }

    onConnected(socket) {
        if (socket !== this.sock) return;
        this.status = 'connected';
        this.user = socket.user;
        this.startTime = Date.now();
        this.reconnectAttempts = 0;
        this.reconnectDelay = 5000;
        this.qrCode = this.pairCode = this.pairingPhoneNumber = null;
        this.error = null;
        this.emit('connected', socket);
        this.emit('statusChange', this.getStatus());
        this.startKeepAlive();
        this.startConnectionMonitor();
        console.log(`✅ Bot ${this.number} connected as ${socket.user?.name || socket.user?.id}`);
    }

    onLoggedOut() {
        this.status = 'stopped';
        this.user = null;
        this.qrCode = this.pairCode = this.pairingPhoneNumber = null;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 5000;
        this.stopKeepAlive();
        this.stopConnectionMonitor();
        if (this.sock) {
            this.sock.ev.removeAllListeners();
            this.sock.ws?.close();
        }
        this.sock = this.creds = null;
        fs.rmSync(this.sessionPath, { recursive: true, force: true });
        this.emit('statusChange', this.getStatus());
        console.log(`❌ Bot ${this.number} logged out; pair it again from the admin panel.`);
    }

    scheduleReconnect() {
        if (this.stopping || this.reconnectTimer) return;
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
        console.log(`🔄 Bot ${this.number} reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms`);
        const oldSocket = this.sock;
        this.sock = null;
        if (oldSocket) { oldSocket.ev.removeAllListeners(); oldSocket.ws?.close(); }
        this.status = 'reconnecting';
        this.emit('statusChange', this.getStatus());
        this.stopKeepAlive();
        this.stopConnectionMonitor();
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.start().catch(error => console.error(`Reconnect failed for ${this.number}:`, error.message));
        }, this.reconnectDelay);
    }

    async requestPairCode(phoneNumber) {
        const normalizedNumber = normalizePhoneNumber(phoneNumber);
        if (!/^\d{7,15}$/.test(normalizedNumber)) throw new Error('Enter a valid phone number with country code.');
        if (this.status === 'connected' || this.creds?.registered) throw new Error('This WhatsApp session is already registered.');
        if (this.pairCode && this.pairingPhoneNumber === normalizedNumber) return this.pairCode;

        this.pairingInProgress = true;
        this.pairingPhoneNumber = normalizedNumber;
        try {
            // QR mode starts its own timeout. Replace that socket with a fresh
            // unregistered socket before requesting a pairing code.
            if (this.sock) {
                const oldSocket = this.sock;
                this.sock = null;
                oldSocket.ev?.removeAllListeners?.();
                oldSocket.ws?.close?.();
            }
            await this.ensureSocket();
            const socket = this.sock;
            if (!socket) throw new Error('WhatsApp pairing socket was not created');
            console.log(`[${this.number}] Waiting for pairing socket for +${normalizedNumber}`);
            await waitForSocket(socket, 60000);
            if (socket !== this.sock || this.status === 'connected' || this.creds?.registered) {
                throw new Error('The WhatsApp session changed while waiting. Please try pairing again.');
            }
            console.log(`[${this.number}] Requesting WhatsApp pair code`);
            const code = await socket.requestPairingCode(normalizedNumber);
            this.pairCode = formatPairingCode(code);
            if (!this.pairCode) throw new Error('WhatsApp returned an empty pairing code. Please try again.');
            this.qrCode = null;
            console.log(`[${this.number}] Pair code generated successfully`);
            this.emit('pairCode', this.pairCode);
            this.emit('statusChange', this.getStatus());
            return this.pairCode;
        } catch (error) {
            this.error = error?.message || String(error);
            this.emit('statusChange', this.getStatus());
            throw error;
        } finally {
            this.pairingInProgress = false;
        }
    }

    waitForQRCode(timeoutMs = 30000) {
        if (this.qrCode) return Promise.resolve(this.qrCode);
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.off('qr', onQr);
                reject(new Error('QR code was not received in time. Check the WhatsApp connection and try again.'));
            }, timeoutMs);
            const onQr = qr => { clearTimeout(timer); this.off('qr', onQr); resolve(qr); };
            this.on('qr', onQr);
            if (this.qrCode) onQr(this.qrCode);
        });
    }

    async getQRCode(timeoutMs = 30000) {
        if (this.status === 'connected' || this.creds?.registered) throw new Error('This WhatsApp session is already registered.');
        if (this.qrCode) return this.qrCode;
        const qrPromise = this.waitForQRCode(timeoutMs);
        const result = await this.start();
        if (!result.success) throw new Error(result.message || 'Failed to start session');
        return qrPromise;
    }

    async logout() {
        if (this.sock) await this.sock.logout();
        await this.stop();
    }

    async stop() {
        this.stopping = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        const socket = this.sock;
        this.sock = null;
        if (socket) { socket.ev.removeAllListeners(); socket.ws?.close(); }
        this.status = 'stopped';
        this.user = null;
        this.qrCode = this.pairCode = this.pairingPhoneNumber = null;
        this.error = null;
        this.stopKeepAlive();
        this.stopConnectionMonitor();
        this.emit('statusChange', this.getStatus());
    }

    async refreshQR() {
        if (this.status === 'connected' || this.creds?.registered) throw new Error('This WhatsApp session is already registered.');
        await this.stop();
        this.stopping = false;
        const qrPromise = this.waitForQRCode(30000);
        const result = await this.start();
        if (!result.success) throw new Error(result.message || 'Failed to start session for QR');
        return { success: true, qr: await qrPromise };
    }

    async ensureSocket() {
        if (this.sock) return;
        fs.mkdirSync(this.sessionPath, { recursive: true });
        const credsPath = path.join(this.sessionPath, 'creds.json');
        if (fs.existsSync(credsPath)) {
            try {
                const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                if (creds.registered !== true) {
                    fs.rmSync(this.sessionPath, { recursive: true, force: true });
                    fs.mkdirSync(this.sessionPath, { recursive: true });
                }
            } catch (error) {
                fs.rmSync(this.sessionPath, { recursive: true, force: true });
                fs.mkdirSync(this.sessionPath, { recursive: true });
            }
        }

        const version = await getBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
        this.creds = state.creds;
        const socket = makeWASocket({
            version,
            logger: log,
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, log.child({ component: 'auth-keys' }))
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async key => {
                const message = await store.loadMessage(key.remoteJid, key.id);
                return message?.message || '';
            },
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            maxMsgRetryCount: 5
        });
        this.sock = socket;
        socket.ev.on('creds.update', saveCreds);
        store.bind(socket.ev);
        this.setupEventHandlers(socket);
        this.status = 'connecting';
        this.error = null;
        this.emit('statusChange', this.getStatus());
    }

    getStatus() {
        return {
            number: this.number,
            name: this.name,
            isOwner: this.isOwner,
            status: this.status,
            user: this.user ? { id: this.user.id, name: this.user.name, platform: this.user.platform } : null,
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
        return { rss: Math.round(mem.rss / 1048576), heapUsed: Math.round(mem.heapUsed / 1048576), heapTotal: Math.round(mem.heapTotal / 1048576) };
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
                for (const session of config.sessions || []) this.createSession(session.number, session.name, session.isOwner, false);
                this.startOwnerSessions();
            }
        } catch (error) { console.error('Error loading bot config:', error); }
    }

    startOwnerSessions() {
        for (const [number, session] of this.sessions) {
            if (session.isOwner && session.status === 'stopped') {
                console.log(`🚀 Auto-starting owner session: ${number}`);
                session.start().catch(error => console.error(`Failed to start session ${number}:`, error.message));
            }
        }
    }

    saveConfig() {
        try {
            const sessions = Array.from(this.sessions.values()).map(session => ({ number: session.number, name: session.name, isOwner: session.isOwner }));
            fs.mkdirSync(path.dirname(BOT_CONFIG_FILE), { recursive: true });
            fs.writeFileSync(BOT_CONFIG_FILE, JSON.stringify({ sessions }, null, 2));
        } catch (error) { console.error('Error saving bot config:', error); }
    }

    createSession(number, name, isOwner = false, autoStart = true) {
        if (this.sessions.has(number)) return this.sessions.get(number);
        const session = new BotSession(number, name, isOwner);
        this.sessions.set(number, session);
        session.on('statusChange', status => this.emit('sessionStatusChange', status));
        session.on('connected', socket => this.emit('sessionConnected', number, socket));
        this.saveConfig();
        if (autoStart) session.start().catch(error => console.error(`Failed to start session ${number}:`, error.message));
        return session;
    }

    getSession(number) { return this.sessions.get(number); }
    getAllSessions() { return Array.from(this.sessions.values()).map(session => session.getStatus()); }

    async startSession(number) {
        const session = this.sessions.get(number);
        return session ? session.start() : { success: false, message: 'Session not found' };
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
        fs.rmSync(session.sessionPath, { recursive: true, force: true });
        this.sessions.delete(number);
        this.saveConfig();
        return { success: true };
    }

    async requestPairCode(number, phoneNumber) {
        const session = this.sessions.get(number);
        if (!session) return { success: false, message: 'Session not found' };
        try { return { success: true, code: await session.requestPairCode(phoneNumber) }; }
        catch (error) { return { success: false, message: error.message }; }
    }

    getOwnerSessions() { return Array.from(this.sessions.values()).filter(session => session.isOwner).map(session => session.getStatus()); }

    startAutoRecovery() {
        setInterval(() => {
            for (const [number, session] of this.sessions) {
                if (session.isOwner && session.status === 'stopped' && session.reconnectAttempts === 0) {
                    console.log(`[AutoRecovery] Restarting owner session ${number}`);
                    session.start().catch(error => console.error(`[AutoRecovery] Failed to restart ${number}:`, error.message));
                }
            }
        }, 60000);
    }
}

const botManager = new BotManager();
module.exports = { BotManager, BotSession, botManager, setMessageHandlers };
