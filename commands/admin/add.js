/**
 * Add Command (Multi-Input Support)
 * Adds multiple users to the group
 */

const database = require('../../database');

module.exports = {
  name: 'add',
  aliases: ['invite'],
  description: 'Add one or more users to the group',
  usage: '.add @user1 @user2 or .add num1, num2',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,
  
  async execute(sock, msg, args, extra) {
    try {
      const groupId = extra.from;
      
      // 1. Collect all target JIDs
      let targetJids = [];

      // A. Check for Mentions
      const mentionedJids = msg.message?.contextInfo?.mentionedJid || [];
      if (mentionedJids.length > 0) {
        targetJids = [...targetJids, ...mentionedJids];
      }

      // B. Check for Raw Numbers in Args
      // We join all args back together to handle cases like ".add 123 456" or ".add 123,456"
      const argString = args.join(' ');
      if (argString) {
        // Split by comma or space
        const rawNumbers = argString.split(/[\s,]+/);
        
        rawNumbers.forEach(num => {
          const cleanNum = num.replace(/\D/g, ''); // Remove non-digits
          if (cleanNum.length >= 10) { // Basic validation
            targetJids.push(`${cleanNum}@s.whatsapp.net`);
          }
        });
      }

      // Remove duplicates
      targetJids = [...new Set(targetJids)];

      if (targetJids.length === 0) {
        return extra.reply('*Please mention users or provide phone numbers.\nUsage: .add @user1 @user2 or .add 62812..., 62898...*');
      }

      // 2. Filter out users who are already in the group
      const groupMetadata = await sock.groupMetadata(groupId);
      const existingParticipants = new Set(groupMetadata.participants.map(p => p.id));
      
      const toAdd = targetJids.filter(jid => !existingParticipants.has(jid));
      const alreadyIn = targetJids.filter(jid => existingParticipants.has(jid));

      if (toAdd.length === 0) {
        return extra.reply('*All specified users are already in the group.*');
      }

      // 3. Process Adds
      let successCount = 0;
      let failedCount = 0;
      let inviteLinksSent = 0;

      // Note: WhatsApp limits how many people you can add at once. 
      // It's safer to process them in small batches or individually to catch errors.
      
      for (const jid of toAdd) {
        try {
          const response = await sock.groupParticipantsUpdate(groupId, [jid], 'add');
          const status = response[0]?.status;

          if (status === 200) {
            successCount++;
          } else {
            // If direct add fails, try sending invite link
            throw new Error(`Status ${status}`);
          }
        } catch (err) {
          failedCount++;
          
          // Fallback: Send Invite Link
          try {
            const inviteCode = await sock.groupInviteCode(groupId);
            const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
            
            // Try to DM the user
            await sock.sendMessage(jid, { 
              text: `*👋 Hello!* You were invited to *${groupMetadata.subject}*.\nJoin here: ${inviteLink}` 
            });
            inviteLinksSent++;
          } catch (dmErr) {
            // Could not DM either
            console.log(`Failed to add or DM ${jid}`);
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));
      }

      // 4. Construct Final Report
      let report = `*✅ Add Process Complete*\n\n`;
      report += `*Successfully Added:* ${successCount}\n`;
      report += `*Invite Links Sent:* ${inviteLinksSent}\n`;
      report += `*Failed/Skipped:* ${failedCount}\n`;
      
      if (alreadyIn.length > 0) {
        report += `\n⚠️ ${alreadyIn.length} users were already in the group.`;
      }

      return extra.reply(report);

    } catch (error) {
      console.error('Add Command Error:', error);
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
