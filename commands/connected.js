const { getConnectedNumbers, addConnectedNumber, removeConnectedNumber, setOwnerNumber } = require('../lib/webgui');

async function connectedNumbersCommand(sock, chatId, message, args) {
    const isOwner = message.key.fromMe || (await require('../lib/isOwner')(message.key.participant || message.key.remoteJid, sock, chatId));

    if (!isOwner) {
        await sock.sendMessage(chatId, {
            text: '❌ This command is only available for the owner!'
        });
        return;
    }

    const action = args[0]?.toLowerCase();
    const numbers = getConnectedNumbers();

    switch (action) {
        case 'add': {
            const number = args[1];
            const name = args.slice(2).join(' ') || number;
            const isOwnerFlag = args.includes('--owner');

            if (!number || !/^\d+$/.test(number)) {
                await sock.sendMessage(chatId, {
                    text: '❌ Usage: .connected add <number> [name] [--owner]\nExample: .connected add 15551234567 "John Doe" --owner'
                });
                return;
            }

            addConnectedNumber(number, name, isOwnerFlag);
            await sock.sendMessage(chatId, {
                text: `✅ Added connected number: ${number} (${name})${isOwnerFlag ? ' [OWNER]' : ''}`
            });
            break;
        }

        case 'remove':
        case 'delete': {
            const number = args[1];
            if (!number) {
                await sock.sendMessage(chatId, {
                    text: '❌ Usage: .connected remove <number>'
                });
                return;
            }

            removeConnectedNumber(number);
            await sock.sendMessage(chatId, {
                text: `✅ Removed connected number: ${number}`
            });
            break;
        }

        case 'owner':
        case 'setowner': {
            const number = args[1];
            if (!number) {
                await sock.sendMessage(chatId, {
                    text: '❌ Usage: .connected owner <number>'
                });
                return;
            }

            const found = numbers.find(n => n.number === number);
            if (!found) {
                await sock.sendMessage(chatId, {
                    text: `❌ Number ${number} not found in connected numbers`
                });
                return;
            }

            setOwnerNumber(number);
            await sock.sendMessage(chatId, {
                text: `✅ Set ${number} as bot owner`
            });
            break;
        }

        case 'list':
        default: {
            if (numbers.length === 0) {
                await sock.sendMessage(chatId, {
                    text: '📋 No connected numbers yet.\nUse `.connected add <number> [name] [--owner]` to add one.'
                });
                return;
            }

            let text = '📋 *Connected Numbers*\n\n';
            numbers.forEach((n, i) => {
                text += `${i + 1}. ${n.number} - ${n.name}\n`;
                text += `   ${n.isOwner ? '👑 OWNER' : '👤 User'} | Added: ${new Date(n.connectedAt).toLocaleString()}\n\n`;
            });
            text += '\n*Commands:*\n';
            text += `• .connected add <number> [name] [--owner] - Add number\n`;
            text += `• .connected remove <number> - Remove number\n`;
            text += `• .connected owner <number> - Set as owner\n`;
            text += `• .connected list - Show this list`;

            await sock.sendMessage(chatId, { text });
            break;
        }
    }
}

module.exports = connectedNumbersCommand;