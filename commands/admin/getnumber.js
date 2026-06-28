/**
 * GetNumber Command
 * Extracts all group numbers, saves to .txt, and uploads to group
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'getnumber',
  aliases: ['getall', 'listnum', 'exportnums'],
  description: 'Export all group member numbers to a .txt file',
  usage: '.getnumber',
  category: 'admin',
  groupOnly: true,
  adminOnly: false, 
  botAdminNeeded: false,
  
  async execute(sock, msg, args, extra) {
    let statusMsgKey = null; // To track the progress message for editing

    try {
      const groupId = extra.from;
      
      // 1. Send Initial Status
      const initialMsg = await extra.reply('*⏳ Processing... Fetching group metadata.*');
      statusMsgKey = initialMsg.key;

      // 2. Fetch Group Metadata
      const groupMetadata = await sock.groupMetadata(groupId);
      const participants = groupMetadata.participants;

      if (!participants || participants.length === 0) {
        await sock.sendMessage(groupId, { delete: statusMsgKey });
        return extra.reply('*No participants found in this group.*');
      }

      // Update Status
      await sock.sendMessage(groupId, { 
        text: '*⏳ Extracting numbers...*', 
        edit: statusMsgKey 
      });

      // 3. Extract and Clean Numbers
      // Filter out invalid entries and format cleanly
      const numbers = participants
        .map(p => p.id.split('@')[0]) // Remove @s.whatsapp.net
        .filter(num => /^\d+$/.test(num)); // Ensure only digits remain

      const total = numbers.length;

      if (total === 0) {
        await sock.sendMessage(groupId, { delete: statusMsgKey });
        return extra.reply('*No valid phone numbers found.*');
      }

      // 4. Create the Text File
      const fileName = `group_numbers_${groupId.split('@')[0]}.txt`;
      const filePath = path.join(__dirname, '../../temp', fileName); // Ensure 'temp' folder exists
      
      // Create temp directory if it doesn't exist
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)){
          fs.mkdirSync(tempDir, { recursive: true });
      }

      // Write numbers to file (one per line)
      const fileContent = numbers.join('\n');
      fs.writeFileSync(filePath, fileContent);

      // Update Status
      await sock.sendMessage(groupId, { 
        text: `*📄 Found ${total} numbers.*\n*Uploading file...*`, 
        edit: statusMsgKey 
      });

      // 5. Upload File to WhatsApp
      await sock.sendMessage(groupId, {
        document: fs.readFileSync(filePath),
        mimetype: 'text/plain',
        fileName: fileName,
        caption: `*📋 Group Number Export*\n\n*Group:* ${groupMetadata.subject}\n*Total Numbers:* ${total}\n\nYou can use this file with the *.addfile* command.`
      });

      // 6. Cleanup & Final Status
      fs.unlinkSync(filePath); // Delete local file after sending
      
      await sock.sendMessage(groupId, { 
        text: '*✅ Done! File sent above.*', 
        edit: statusMsgKey 
      });

      // Delete the status message after 3 seconds to keep chat clean
      setTimeout(async () => {
        try {
            await sock.sendMessage(groupId, { delete: statusMsgKey });
        } catch (e) {}
      }, 3000);

    } catch (error) {
      console.error('[GetNumber] Error:', error);
      
      // Try to update the status message with error
      if (statusMsgKey) {
        try {
            await sock.sendMessage(extra.from, { 
                text: `❌ Error: ${error.message}`, 
                edit: statusMsgKey 
            });
        } catch (e) {}
      } else {
        await extra.reply(`❌ Error: ${error.message}`);
      }
    }
  }
};
