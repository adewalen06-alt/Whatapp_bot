const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { normalizeJidWithLid } = require('../lib/jidHelper');

const configPath = path.join(__dirname, '..', 'data', 'vv.json');

function readMode() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.mode === 'dm' ? 'dm' : 'normal';
    } catch (_) {
        return 'normal';
    }
}

function writeMode(mode) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    const temporaryPath = `${configPath}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify({ mode }, null, 2));
    fs.renameSync(temporaryPath, configPath);
}

async function resolvePhoneJid(sock, jid) {
    const raw = String(jid || '').replace(/:\d+@/, '@');
    if (!raw || raw.endsWith('@g.us') || raw.endsWith('@broadcast')) return '';

    if (raw.endsWith('@lid') || raw.endsWith('@hosted.lid')) {
        try {
            const pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(raw);
            if (pn) return String(pn).replace(/:\d+@/, '@');
        } catch (_) {}
    }

    const normalized = normalizeJidWithLid(raw);
    if (!normalized || normalized === '@s.whatsapp.net') return '';
    if (normalized.endsWith('@s.whatsapp.net')) return normalized;
    return '';
}

async function getSenderJid(sock, message, senderId) {
    const connectedJid = String(sock.user?.id || '').replace(/:\d+@/, '@');
    const resolvedConnectedJid = await resolvePhoneJid(sock, connectedJid);
    if (resolvedConnectedJid) return resolvedConnectedJid;

    const candidates = [
        message.key?.remoteJidAlt,
        message.key?.participantAlt,
        message.key?.participantPn,
        senderId,
        message.key?.participant,
        message.key?.remoteJid
    ];

    for (const candidate of candidates) {
        const jid = await resolvePhoneJid(sock, candidate);
        if (jid) return jid;
    }
    return '';
}

async function viewonceCommand(sock, chatId, message, senderId, args = '') {
    const reply = (text) => sock.sendMessage(chatId, { text }, { quoted: message });

    const setting = String(args || '').trim().toLowerCase().match(/^set\s+(dm|normal)$/);
    if (setting) {
        writeMode(setting[1]);
        return reply(setting[1] === 'dm'
            ? '✅ .vv mode set to *DM*. View-onces will be sent to the user DM.'
            : '✅ .vv mode set to *Normal*. View-onces will be sent here.');
    }

    try {
        const context = message.message?.extendedTextMessage?.contextInfo;
        const quoted = context?.quotedMessage;

        if (!quoted) {
            return reply('🗑️ Reply to a *view-once* message with `.vv`.\nUse `.vv set dm` or `.vv set normal` to change the destination.');
        }

        let content;
        let type;

        if (quoted.viewOnceMessage?.message) {
            content = quoted.viewOnceMessage.message;
            type = Object.keys(content)[0];
        } else if (quoted.viewOnceMessageV2?.message) {
            content = quoted.viewOnceMessageV2.message;
            type = Object.keys(content)[0];
        } else if (quoted.viewOnceMessageV2Extension?.message) {
            content = quoted.viewOnceMessageV2Extension.message;
            type = Object.keys(content)[0];
        } else if (quoted.imageMessage?.viewOnce) {
            content = quoted;
            type = 'imageMessage';
        } else if (quoted.videoMessage?.viewOnce) {
            content = quoted;
            type = 'videoMessage';
        } else if (quoted.audioMessage?.viewOnce) {
            content = quoted;
            type = 'audioMessage';
        }

        if (!content || !['imageMessage', 'videoMessage', 'audioMessage'].includes(type)) {
            return reply('❌ This is not a supported view-once image, video, or audio message.');
        }

        const media = content[type];
        const mediaType = type === 'imageMessage' ? 'image' : type === 'videoMessage' ? 'video' : 'audio';
        const stream = await downloadContentFromMessage(media, mediaType);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        if (!buffer.length) {
            return reply('❌ The view-once media was empty or unavailable. Re-send the view-once and try again.');
        }
        console.log(`[vv] Downloaded ${mediaType}: ${buffer.length} bytes, mimetype=${media.mimetype || 'unknown'}`);

        let payload;
        if (mediaType === 'image') {
            payload = { image: buffer, caption: media.caption || '', mimetype: media.mimetype || 'image/jpeg' };
        } else if (mediaType === 'video') {
            payload = { video: buffer, caption: media.caption || '', mimetype: media.mimetype || 'video/mp4' };
        } else {
            payload = { audio: buffer, mimetype: media.mimetype || 'audio/ogg; codecs=opus', ptt: true };
        }

        let destination = chatId;
        if (readMode() === 'dm') {
            destination = await getSenderJid(sock, message, senderId);
            if (!destination || destination.endsWith('@g.us')) {
                return reply('❌ Could not find the sender DM.');
            }
        }

        console.log(`[vv] Sending ${mediaType} to ${destination}`);
        try {
            await sock.sendMessage(destination, payload);
            console.log(`[vv] Media sent successfully to ${destination}`);
        } catch (error) {
            if (error?.output?.statusCode !== 428) throw error;
            await new Promise(resolve => setTimeout(resolve, 1500));
            await sock.sendMessage(destination, payload);
        }
        if (destination !== chatId) {
            await reply('✅ View-once sent to your DM.');
        }
    } catch (error) {
        console.error('[vv]', error?.message || error);
        await reply('❌ Error processing view-once: ' + (error.message || 'Unknown error'));
    }
}

module.exports = viewonceCommand;