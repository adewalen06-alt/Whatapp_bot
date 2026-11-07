const settings = require('../settings');
const { getConnectedNumbers } = require('../lib/webgui');

async function webguiCommand(sock, chatId) {
    const numbers = getConnectedNumbers();
    const ownerNumbers = numbers.filter(n => n.isOwner).map(n => n.number);
    const otherNumbers = numbers.filter(n => !n.isOwner).map(n => n.number);

    const text = `🌐 *Topai Bot Web GUI*\n\n` +
        `📱 *Access URLs:*\n` +
        `• Admin Panel: http://localhost:3000/admin.html\n` +
        `• User Panel: http://localhost:3000/user.html\n` +
        `• Main Page: http://localhost:3000/\n\n` +
        `🔐 *Admin Panel:*\n` +
        `• Secure login with strong password\n` +
        `• Manage bot connection, groups, contacts\n` +
        `• Add/remove connected numbers\n` +
        `• Set bot owner\n` +
        `• System monitoring (RAM, CPU, uptime)\n` +
        `• Generate pair code / QR code\n\n` +
        `👤 *User Panel:*\n` +
        `• Login with connected WhatsApp number\n` +
        `• View your groups and contacts\n` +
        `• Check bot status\n\n` +
        `📋 *Connected Numbers (${numbers.length}):*\n` +
        (ownerNumbers.length ? `👑 Owners: ${ownerNumbers.join(', ')}\n` : '') +
        (otherNumbers.length ? `👥 Users: ${otherNumbers.join(', ')}\n` : '') +
        (numbers.length === 0 ? 'No numbers connected yet.\n' : '') +
        `\n💡 *Note:* Web GUI runs on the same machine as the bot.\nUse your server's IP instead of localhost for remote access.\nExample: http://YOUR_SERVER_IP:3000/admin.html`;

    await sock.sendMessage(chatId, {
        text: text,
        contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
        }
    });
}

module.exports = webguiCommand;