/**
 * AddFile Command
 * Adds users from an attached .txt or .csv file
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'addfile', // Changed back to addfile
  aliases: ['addlist', 'bulkadd'],
  description: 'Add users from an attached text file',
  usage: 'Reply to a .txt file with .addfile',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,
  
  async execute(sock, msg, args, extra) {
    try {
      const groupId = extra.from;

      // 1. Identify the Quoted Message (The File)
      let quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      // If no quoted message, check if the current message IS the document (rare but possible)
      if (!quotedMsg && msg.message?.documentMessage) {
        quotedMsg = msg.message;
      }

      if (!quotedMsg) {
        return extra.reply('*Please reply to a .txt or .csv file containing phone numbers.*');
      }

      // 2. Download the File
      let buffer;
      try {
        // Try to download using the standard helper
        buffer = await sock.downloadMediaMessage(quotedMsg);
      } catch (downloadErr) {
        console.error('Download Error:', downloadErr);
        return extra.reply('*❌ Failed to download the file. Please ensure it is a valid .txt or .csv document.*');
      }

      if (!buffer) {
        return extra.reply('*❌ File content is empty.*');
      }

      // 3. Parse Numbers
      const content = buffer.toString('utf-8');
      const lines = content.split(/\r?\n/);
      const numbers = [];
      
      lines.forEach(line => {
        const cleanNum = line.replace(/\D/g, ''); // Remove non-digits
        // Validate length (most phone numbers are 10-15 digits)
        if (cleanNum.length >= 10 && cleanNum.length <= 15) {
          numbers.push(`${cleanNum}@s.whatsapp.net`);
        }
      });

      // Remove duplicates
      const uniqueNumbers = [...new Set(numbers)];

      if (uniqueNumbers.length === 0) {
        return extra.reply('*No valid phone numbers found in the file.*\n*Ensure numbers have country codes (e.g., 62812...)*');
      }

      // 4. Start Processing
      const BATCH_SIZE = 5; // Reduced to 5 for safety on mobile connections
      const total = uniqueNumbers.length;
      
      await extra.reply(`*📂 Found ${total} valid numbers.*\n*Starting process... This may take a while.*`);

      let success = 0;
      let failed = 0;
      let invited = 0;
      let skipped = 0;

      // Get Group Metadata once to check existing members (optimization)
      let groupMetadata;
      try {
        groupMetadata = await sock.groupMetadata(groupId);
      } catch (e) {
        return extra.reply('*❌ Could not fetch group metadata. Is the bot an admin?*');
      }
      
      const existingJids = new Set(groupMetadata.participants.map(p => p.id));

      // Process in batches
      for (let i = 0; i < uniqueNumbers.length; i += BATCH_SIZE) {
        const batch = uniqueNumbers.slice(i, i + BATCH_SIZE);
        
        for (const jid of batch) {
          // Skip if already in group
          if (existingJids.has(jid)) {
            skipped++;
            continue;
          }

          try {
            // Attempt to Add
            const response = await sock.groupParticipantsUpdate(groupId, [jid], 'add');
            const status = response[0]?.status;

            if (status === 200) {
              success++;
              existingJids.add(jid); // Add to set so we don't try again
            } else {
              throw new Error(`Status ${status}`);
            }
          } catch (err) {
            failed++;
            
            // Fallback: Send Invite Link via DM
            try {
              const code = await sock.groupInviteCode(groupId);
              await sock.sendMessage(jid, { 
                text: `*👋 Hello!* You were invited to join *${groupMetadata.subject}*.\n\nJoin here: https://chat.whatsapp.com/${code}` 
              });
              invited++;
            } catch (dmErr) {
              // Could not DM (privacy settings or not in contacts)
              console.log(`Failed to DM ${jid}`);
            }
          }
          
          // Delay to prevent rate limit ban (2-3 seconds is safer)
          await new Promise(r => setTimeout(r, 2500)); 
        }
        
        // Progress Update
        const currentProcessed = Math.min(i + BATCH_SIZE, total);
        await extra.reply(`*⏳ Progress:* ${currentProcessed}/${total}\n*✅ Added:* ${success} | *📩 Invited:* ${invited}`);
      }

      // Final Report
      return extra.reply(
        `*✅ Process Complete*\n\n` +
        `*Total Valid:* ${total}\n` +
        `*Successfully Added:* ${success}\n` +
        `*Invite Links Sent:* ${invited}\n` +
        `*Already in Group:* ${skipped}\n` +
        `*Failed:* ${failed}`
      );

    } catch (error) {
      console.error('AddFile Command Error:', error);
      await extra.reply(`❌ Critical Error: ${error.message}`);
    }
  }
};
