const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const chalk = require('chalk');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const cookie = require('cookie');
const { botManager, setMessageHandlers } = require('./botManager');

const SESSIONS_FILE = './data/webgui_sessions.json';
const ADMIN_CONFIG_FILE = './data/webgui_admin.json';
const COMMAND_CONFIG_FILE = './data/command_config.json';

let wss = null;
let server = null;
let adminConfig = null;
let commandConfig = null;

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'knightbot_salt').digest('hex');
}

function loadSessions() {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveSessions(sessions) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

function loadAdminConfig() {
    try {
        if (fs.existsSync(ADMIN_CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(ADMIN_CONFIG_FILE, 'utf8'));
        }
    } catch (e) {}
    return null;
}

function saveAdminConfig(config) {
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(config, null, 2));
}

function loadCommandConfig() {
    try {
        if (fs.existsSync(COMMAND_CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(COMMAND_CONFIG_FILE, 'utf8'));
        }
    } catch (e) {}
    return { global: { enabled: [], disabled: [] }, sessions: {} };
}

function saveCommandConfig(config) {
    fs.writeFileSync(COMMAND_CONFIG_FILE, JSON.stringify(config, null, 2));
}

function parseCookies(req) {
    return cookie.parse(req.headers.cookie || '');
}

function authenticateAdmin(req) {
    const cookies = parseCookies(req);
    const sessions = loadSessions();
    const token = cookies.admin_token;
    if (token && sessions[token] && sessions[token].isAdmin) {
        return sessions[token];
    }
    return null;
}

function setCookie(res, name, value, options = {}) {
    const cookieStr = cookie.serialize(name, value, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        ...options
    });
    res.setHeader('Set-Cookie', cookieStr);
}

function clearCookie(res, name) {
    res.setHeader('Set-Cookie', cookie.serialize(name, '', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
    }));
}

function serveStatic(res, filePath, contentType) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

function sendJSON(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

async function handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    // Auth check helper
    const cookies = parseCookies(req);
    const sessions = loadSessions();
    const adminToken = cookies.admin_token;
    let isAdmin = adminToken && sessions[adminToken]?.isAdmin;
    
    // Command management API
    function setupCommandAPI() {
        // Get all commands (global + session-specific)
        if (pathname === '/api/commands' && req.method === 'GET') {
            if (!isAdmin) {
                sendJSON(res, { success: false, message: 'Admin required' }, 403);
                return true;
            }
            
            // Get available commands from commands directory
            const commandsDir = path.join(__dirname, '../commands');
            let availableCommands = [];
            try {
                const files = fs.readdirSync(commandsDir);
                availableCommands = files
                    .filter(f => f.endsWith('.js'))
                    .map(f => f.replace('.js', ''))
                    .sort();
            } catch (e) {}
            
            const config = loadCommandConfig();
            const sessionNumber = url.searchParams.get('session');
            
            let sessionConfig = { enabled: [], disabled: [] };
            if (sessionNumber && config.sessions[sessionNumber]) {
                sessionConfig = config.sessions[sessionNumber];
            }
            
            // Merge available commands with config to ensure all commands are listed
            const allCommands = [...new Set([...availableCommands, ...config.global.enabled, ...config.global.disabled])].sort();
            
            const commands = allCommands.map(cmd => ({
                name: cmd,
                globalEnabled: config.global.enabled.includes(cmd),
                globalDisabled: config.global.disabled.includes(cmd),
                sessionEnabled: sessionConfig.enabled.includes(cmd),
                sessionDisabled: sessionConfig.disabled.includes(cmd),
                effectiveEnabled: sessionConfig.enabled.includes(cmd) || (!sessionConfig.disabled.includes(cmd) && config.global.enabled.includes(cmd))
            }));
            
            sendJSON(res, { success: true, commands, availableCommands });
            return true;
        }
        
        // Update global command status
        if (pathname === '/api/commands/global' && req.method === 'PATCH') {
            if (!isAdmin) {
                sendJSON(res, { success: false, message: 'Admin required' }, 403);
                return true;
            }
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { command, enabled } = JSON.parse(body);
                    if (!command) {
                        sendJSON(res, { success: false, message: 'Command name required' }, 400);
                        return;
                    }
                    const config = loadCommandConfig();
                    if (enabled) {
                        config.global.enabled = config.global.enabled.filter(c => c !== command);
                        if (!config.global.enabled.includes(command)) config.global.enabled.push(command);
                        config.global.disabled = config.global.disabled.filter(c => c !== command);
                    } else {
                        config.global.disabled = config.global.disabled.filter(c => c !== command);
                        if (!config.global.disabled.includes(command)) config.global.disabled.push(command);
                        config.global.enabled = config.global.enabled.filter(c => c !== command);
                    }
                    saveCommandConfig(config);
                    sendJSON(res, { success: true, config });
                } catch (e) {
                    sendJSON(res, { success: false, message: e.message }, 400);
                }
            });
            return true;
        }
        
        // Update session-specific command status
        if (pathname.startsWith('/api/commands/session/') && req.method === 'PATCH') {
            if (!isAdmin) {
                sendJSON(res, { success: false, message: 'Admin required' }, 403);
                return true;
            }
            const sessionNumber = pathname.split('/').pop();
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { command, enabled } = JSON.parse(body);
                    if (!command) {
                        sendJSON(res, { success: false, message: 'Command name required' }, 400);
                        return;
                    }
                    const config = loadCommandConfig();
                    if (!config.sessions[sessionNumber]) {
                        config.sessions[sessionNumber] = { enabled: [], disabled: [] };
                    }
                    if (enabled) {
                        config.sessions[sessionNumber].enabled = config.sessions[sessionNumber].enabled.filter(c => c !== command);
                        if (!config.sessions[sessionNumber].enabled.includes(command)) config.sessions[sessionNumber].enabled.push(command);
                        config.sessions[sessionNumber].disabled = config.sessions[sessionNumber].disabled.filter(c => c !== command);
                    } else {
                        config.sessions[sessionNumber].disabled = config.sessions[sessionNumber].disabled.filter(c => c !== command);
                        if (!config.sessions[sessionNumber].disabled.includes(command)) config.sessions[sessionNumber].disabled.push(command);
                        config.sessions[sessionNumber].enabled = config.sessions[sessionNumber].enabled.filter(c => c !== command);
                    }
                    saveCommandConfig(config);
                    sendJSON(res, { success: true, config: config.sessions[sessionNumber] });
                } catch (e) {
                    sendJSON(res, { success: false, message: e.message }, 400);
                }
            });
            return true;
        }
        
        return false;
    }
    
    if (setupCommandAPI()) return;
    
    if (pathname === '/' || pathname === '/index.html') {
        serveStatic(res, path.join(__dirname, '../public/index.html'), 'text/html');
        return;
    }

    if (pathname === '/admin.html') {
        serveStatic(res, path.join(__dirname, '../public/admin.html'), 'text/html');
        return;
    }

    if (pathname.startsWith('/public/')) {
        const filePath = path.join(__dirname, '..', pathname);
        const ext = path.extname(filePath);
        const types = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        serveStatic(res, filePath, types[ext] || 'text/plain');
        return;
    }

    // Auth endpoints
    if (pathname === '/api/auth/admin/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { password } = JSON.parse(body);
                if (!adminConfig) {
                    sendJSON(res, { success: false, message: 'Admin not configured' }, 400);
                    return;
                }
                if (hashPassword(password) === adminConfig.passwordHash) {
                    const token = generateToken();
                    const sessions = loadSessions();
                    sessions[token] = { isAdmin: true, createdAt: Date.now() };
                    saveSessions(sessions);
                    setCookie(res, 'admin_token', token);
                    sendJSON(res, { success: true });
                } else {
                    sendJSON(res, { success: false, message: 'Invalid password' }, 401);
                }
            } catch (e) {
                sendJSON(res, { success: false, message: 'Invalid request' }, 400);
            }
        });
        return;
    }

    if (pathname === '/api/auth/admin/logout' && req.method === 'POST') {
        const cookies = parseCookies(req);
        const token = cookies.admin_token;
        if (token) {
            const sessions = loadSessions();
            delete sessions[token];
            saveSessions(sessions);
            clearCookie(res, 'admin_token');
        }
        sendJSON(res, { success: true });
        return;
    }

    if (pathname === '/api/auth/admin/check' && req.method === 'GET') {
        const session = authenticateAdmin(req);
        sendJSON(res, { authenticated: !!session, configured: !!adminConfig });
        return;
    }

    // Admin setup
    if (pathname === '/api/admin/setup' && req.method === 'POST') {
        if (adminConfig && !adminConfig.isDefault) {
            sendJSON(res, { success: false, message: 'Admin already configured' }, 400);
            return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { password } = JSON.parse(body);
                if (!password || password.length < 12) {
                    sendJSON(res, { success: false, message: 'Password must be at least 12 characters' }, 400);
                    return;
                }
                const hasUpper = /[A-Z]/.test(password);
                const hasLower = /[a-z]/.test(password);
                const hasNumber = /[0-9]/.test(password);
                const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
                if (!(hasUpper && hasLower && hasNumber && hasSpecial)) {
                    sendJSON(res, { success: false, message: 'Password must contain uppercase, lowercase, number, and special character' }, 400);
                    return;
                }
                adminConfig = {
                    passwordHash: hashPassword(password),
                    createdAt: Date.now()
                };
                saveAdminConfig(adminConfig);
                sendJSON(res, { success: true });
            } catch (e) {
                sendJSON(res, { success: false, message: 'Invalid request' }, 400);
            }
        });
        return;
    }

    const adminSession = authenticateAdmin(req);
    isAdmin = !!adminSession;

    // Bot Sessions API
    if (pathname === '/api/bot/sessions' && req.method === 'GET') {
        if (!isAdmin) {
            sendJSON(res, { success: false, message: 'Admin required' }, 403);
            return;
        }
        const sessions = botManager.getAllSessions();
        sendJSON(res, { success: true, sessions });
        return;
    }

    if (pathname === '/api/bot/sessions' && req.method === 'POST') {
        if (!isAdmin) {
            sendJSON(res, { success: false, message: 'Admin required' }, 403);
            return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { number, name, isOwner } = JSON.parse(body);
                if (!number || !/^\d+$/.test(number)) {
                    sendJSON(res, { success: false, message: 'Valid phone number required' }, 400);
                    return;
                }
                const session = botManager.createSession(number, name || number, isOwner || false, false);
                sendJSON(res, { success: true, session: session.getStatus() });
            } catch (e) {
                sendJSON(res, { success: false, message: e.message }, 400);
            }
        });
        return;
    }

    if (pathname.startsWith('/api/bot/sessions/') && req.method === 'DELETE') {
        if (!isAdmin) {
            sendJSON(res, { success: false, message: 'Admin required' }, 403);
            return;
        }
        const number = pathname.split('/').pop();
        const result = await botManager.removeSession(number);
        sendJSON(res, result);
        return;
    }

    if (pathname.startsWith('/api/bot/sessions/') && req.method === 'PATCH') {
        if (!isAdmin) {
            sendJSON(res, { success: false, message: 'Admin required' }, 403);
            return;
        }
        const number = pathname.split('/').pop();
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { action, name, isOwner } = JSON.parse(body);
                const session = botManager.getSession(number);
                if (!session) {
                    sendJSON(res, { success: false, message: 'Session not found' }, 404);
                    return;
                }
                let result;
                if (action === 'start') {
                    result = await botManager.startSession(number);
                } else if (action === 'stop') {
                    result = await botManager.stopSession(number);
                } else if (action === 'update') {
                    if (name !== undefined) session.name = name;
                    if (isOwner !== undefined) session.isOwner = isOwner;
                    botManager.saveConfig();
                    result = { success: true, message: 'Session updated' };
                } else {
                    sendJSON(res, { success: false, message: 'Invalid action' }, 400);
                    return;
                }
                sendJSON(res, { success: true, session: session.getStatus() });
            } catch (e) {
                sendJSON(res, { success: false, message: e.message }, 400);
            }
        });
        return;
    }

    if (pathname === '/api/bot/sessions/pair-code' && req.method === 'POST') {
        if (!isAdmin) {
            sendJSON(res, { success: false, message: 'Admin required' }, 403);
            return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { number, phoneNumber } = JSON.parse(body);
                const normalizedPhone = String(phoneNumber || '').replace(/\D/g, '');
                if (!number || !/^\d{7,15}$/.test(normalizedPhone)) {
                    sendJSON(res, { success: false, message: 'Session number and a valid phone number with country code are required' }, 400);
                    return;
                }
                const result = await botManager.requestPairCode(number, normalizedPhone);
                sendJSON(res, result);
            } catch (e) {
                sendJSON(res, { success: false, message: e.message }, 400);
            }
        });
        return;
    }

    if (pathname === '/api/bot/sessions/qr-code' && req.method === 'POST') {
        if (!isAdmin) {
            sendJSON(res, { success: false, message: 'Admin required' }, 403);
            return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { number } = JSON.parse(body);
                const session = botManager.getSession(number);
                if (!session) {
                    sendJSON(res, { success: false, message: 'Session not found' }, 404);
                    return;
                }
                // If QR not available or expired, refresh it
                if (session.status !== 'connecting' || !session.qrCode) {
                    const result = await session.refreshQR();
                    if (!result.success) {
                        sendJSON(res, { success: false, message: result.message || 'Failed to refresh QR' }, 400);
                        return;
                    }
                    // Wait for QR to be generated
                    await new Promise(r => setTimeout(r, 2000));
                    const updatedSession = botManager.getSession(number);
                    if (!updatedSession.qrCode) {
                        sendJSON(res, { success: false, message: 'QR code not ready yet, try again in a moment' }, 400);
                        return;
                    }
                    const qrDataUrl = await QRCode.toDataURL(updatedSession.qrCode);
                    sendJSON(res, { success: true, qr: qrDataUrl });
                    return;
                }
                const qrDataUrl = await QRCode.toDataURL(session.qrCode);
                sendJSON(res, { success: true, qr: qrDataUrl });
            } catch (e) {
                sendJSON(res, { success: false, message: e.message }, 400);
            }
        });
        return;
    }

    if (pathname === '/api/bot/sessions/refresh-qr' && req.method === 'POST') {
        if (!isAdmin) {
            sendJSON(res, { success: false, message: 'Admin required' }, 403);
            return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { number } = JSON.parse(body);
                const session = botManager.getSession(number);
                if (!session) {
                    sendJSON(res, { success: false, message: 'Session not found' }, 404);
                    return;
                }
                const result = await session.refreshQR();
                sendJSON(res, result);
            } catch (e) {
                sendJSON(res, { success: false, message: e.message }, 400);
            }
        });
        return;
    }

    // Connected numbers (for user panel)
    if (pathname === '/api/bot/connected-numbers' && req.method === 'GET') {
        const ownerSessions = botManager.getOwnerSessions();
        const numbers = ownerSessions.map(s => ({
            number: s.number,
            name: s.name,
            isOwner: s.isOwner,
            status: s.status,
            connectedAt: s.startTime || Date.now()
        }));
        sendJSON(res, { success: true, numbers });
        return;
    }

    // Admin config
    if (pathname === '/api/admin/config' && req.method === 'GET') {
        if (!isAdmin) {
            sendJSON(res, { success: false, message: 'Admin required' }, 403);
            return;
        }
        sendJSON(res, { configured: !!adminConfig, isDefault: adminConfig?.isDefault || false });
        return;
    }

    if (pathname === '/api/admin/change-password' && req.method === 'POST') {
        if (!isAdmin) {
            sendJSON(res, { success: false, message: 'Admin required' }, 403);
            return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { currentPassword, newPassword } = JSON.parse(body);
                if (!adminConfig || hashPassword(currentPassword) !== adminConfig.passwordHash) {
                    sendJSON(res, { success: false, message: 'Current password incorrect' }, 401);
                    return;
                }
                if (!newPassword || newPassword.length < 12) {
                    sendJSON(res, { success: false, message: 'Password must be at least 12 characters' }, 400);
                    return;
                }
                const hasUpper = /[A-Z]/.test(newPassword);
                const hasLower = /[a-z]/.test(newPassword);
                const hasNumber = /[0-9]/.test(newPassword);
                const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
                if (!(hasUpper && hasLower && hasNumber && hasSpecial)) {
                    sendJSON(res, { success: false, message: 'Password must contain uppercase, lowercase, number, and special character' }, 400);
                    return;
                }
                adminConfig = {
                    passwordHash: hashPassword(newPassword),
                    createdAt: Date.now()
                };
                saveAdminConfig(adminConfig);
                sendJSON(res, { success: true });
            } catch (e) {
                sendJSON(res, { success: false, message: 'Invalid request' }, 400);
            }
        });
        return;
    }

    // System info
    if (pathname === '/api/system/info' && req.method === 'GET') {
        if (!isAdmin) {
            sendJSON(res, { success: false, message: 'Admin required' }, 403);
            return;
        }
        const mem = process.memoryUsage();
        sendJSON(res, {
            success: true,
            memory: {
                rss: Math.round(mem.rss / 1024 / 1024),
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
            },
            uptime: process.uptime(),
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            pid: process.pid
        });
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
}

function setupWebSocket(server) {
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws, req) => {
        const cookies = parseCookies(req);
        const sessions = loadSessions();
        const adminToken = cookies.admin_token;
        const isAdmin = adminToken && sessions[adminToken]?.isAdmin;

        ws.isAdmin = isAdmin;

        const sendUpdate = () => {
            if (ws.readyState !== 1) return;
            const sessionsData = botManager.getAllSessions();
            const mem = process.memoryUsage();
            ws.send(JSON.stringify({
                type: 'fullUpdate',
                data: {
                    sessions: sessionsData,
                    memory: {
                        rss: Math.round(mem.rss / 1024 / 1024),
                        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                        heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
                    },
                    uptime: process.uptime()
                },
                timestamp: Date.now()
            }));
        };

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                } else if (msg.type === 'requestUpdate') {
                    sendUpdate();
                }
            } catch (e) {}
        });

        sendUpdate();
    });

    // Broadcast updates every 3 seconds
    setInterval(() => {
        if (wss) {
            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    const sessionsData = botManager.getAllSessions();
                    const mem = process.memoryUsage();
                    client.send(JSON.stringify({
                        type: 'fullUpdate',
                        data: {
                            sessions: sessionsData,
                            memory: {
                                rss: Math.round(mem.rss / 1024 / 1024),
                                heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                                heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
                            },
                            uptime: process.uptime()
                        },
                        timestamp: Date.now()
                    }));
                }
            });
        }
    }, 3000);
}

function startWebGUI(port = 3000) {
    // Initialize admin config with default password
    initAdminConfig(true);

    server = http.createServer(handleRequest);
    setupWebSocket(server);

    // Listen for session status changes
    botManager.on('sessionStatusChange', (status) => {
        if (wss) {
            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({
                        type: 'sessionUpdate',
                        data: status,
                        timestamp: Date.now()
                    }));
                }
            });
        }
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(chalk.green(`🌐 Web GUI started on http://0.0.0.0:${port}`));
        console.log(chalk.cyan(`   Admin Panel: http://localhost:${port}/admin.html`));
    });

    return server;
}

function initAdminConfig(forceReset = false) {
    adminConfig = loadAdminConfig();
    if (!adminConfig || forceReset) {
        const defaultPassword = 'Topai@123456';
        adminConfig = {
            passwordHash: hashPassword(defaultPassword),
            createdAt: Date.now(),
            isDefault: true
        };
        saveAdminConfig(adminConfig);
        console.log(chalk.yellow(`⚠️ Default admin password: Topai@123456`));
        console.log(chalk.yellow(`   Change it in Settings after login!`));
    }
}

function getBotManager() {
    return botManager;
}

module.exports = {
    startWebGUI,
    initAdminConfig,
    getBotManager,
    setMessageHandlers,
    hashPassword,
    botManager
};