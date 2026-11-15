export default () => ({
  cmd: ["kick"],
  desc: "Kick a member from the group. Mention them or reply to their message.",
  usage: "kick @user | reply",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const {
      sendMessageWTyping,
      isGroup,
      isGroupAdmin,
      isOwner,
      extendedMessageOriginal,
    } = msgInfoObj;

    // --- 1. Must be a group ---
    if (!isGroup) {
      return sendMessageWTyping(
        from,
        { text: "This command only works in groups." },
        { quoted: msg }
      );
    }

    // --- 2. Sender must be admin or owner ---
    if (!isGroupAdmin && !isOwner) {
      return sendMessageWTyping(
        from,
        { text: "Only group admins can use the kick command." },
        { quoted: msg }
      );
    }

    // --- 3. Resolve targets ---
    let usersToKick = [];
    if (extendedMessageOriginal) {
      if (extendedMessageOriginal.mentionedJid?.length > 0) {
        usersToKick = extendedMessageOriginal.mentionedJid;
      } else if (extendedMessageOriginal.participant) {
        usersToKick = [extendedMessageOriginal.participant];
      }
    }

    // Deduplicate
    usersToKick = [...new Set(usersToKick)];

    if (usersToKick.length === 0) {
      return sendMessageWTyping(
        from,
        {
          text: "Please mention the user or reply to their message to kick!",
        },
        { quoted: msg }
      );
    }

    try {
      // --- 4. Normalize bot JID ---
      const botId = sock.user?.id || "";
      const botPhoneNumber = botId.includes(":") ? botId.split(":")[0] : botId;
      const botIdFormatted = botPhoneNumber + "@s.whatsapp.net";

      const normalizePhone = (jid) =>
        jid.includes(":") ? jid.split(":")[0] : jid.split("@")[0];

      // --- 5. Block self-kick ---
      const isTryingToKickBot = usersToKick.some(
        (userId) =>
          userId === botId ||
          userId === botIdFormatted ||
          normalizePhone(userId) === botPhoneNumber
      );

      if (isTryingToKickBot) {
        return sendMessageWTyping(
          from,
          { text: "I can't kick myself 🤖" },
          { quoted: msg }
        );
      }

      // --- 6. Fetch group metadata: verify bot is admin + know who's admin/owner ---
      const metadata = await sock.groupMetadata(from);
      const participants = metadata.participants || [];

      const botIsAdmin = participants.some(
        (p) =>
          normalizePhone(p.id) === botPhoneNumber &&
          (p.admin === "admin" || p.admin === "superadmin")
      );

      if (!botIsAdmin) {
        return sendMessageWTyping(
          from,
          { text: "I need to be a group admin to kick members." },
          { quoted: msg }
        );
      }

      // Build lookup of admins/owners by normalized phone
      const adminPhones = new Set(
        participants
          .filter((p) => p.admin === "admin" || p.admin === "superadmin")
          .map((p) => normalizePhone(p.id))
      );

      const memberPhones = new Set(
        participants.map((p) => normalizePhone(p.id))
      );

      // --- 7. Split targets into valid / skipped ---
      const validTargets = [];
      const skipped = []; // { jid, reason }

      for (const jid of usersToKick) {
        const phone = normalizePhone(jid);

        if (!memberPhones.has(phone)) {
          skipped.push({ jid, reason: "not in group" });
          continue;
        }
        if (adminPhones.has(phone)) {
          skipped.push({ jid, reason: "is an admin" });
          continue;
        }
        validTargets.push(jid);
      }

      if (validTargets.length === 0) {
        const reasons = skipped
          .map((s) => `@${s.jid.split("@")[0]} (${s.reason})`)
          .join(", ");
        return sendMessageWTyping(
          from,
          {
            text: `No one to kick: ${reasons}`,
            mentions: skipped.map((s) => s.jid),
          },
          { quoted: msg }
        );
      }

      // --- 8. Kick one-by-one so one failure doesn't kill the batch ---
      const kicked = [];
      const failed = [];

      for (const jid of validTargets) {
        try {
          const res = await sock.groupParticipantsUpdate(
            from,
            [jid],
            "remove"
          );
          const status = res?.[0]?.status;
          // Baileys returns "200" on success, other codes on failure
          if (status === "200" || status === 200 || status === undefined) {
            kicked.push(jid);
          } else {
            failed.push({ jid, reason: `status ${status}` });
          }
        } catch (err) {
          failed.push({ jid, reason: "API error" });
          console.error(`Kick failed for ${jid}:`, err?.message || err);
        }
      }

      // --- 9. Build accurate report ---
      const lines = [];
      if (kicked.length) {
        lines.push(
          `✅ Kicked: ${kicked.map((j) => `@${j.split("@")[0]}`).join(", ")}`
        );
      }
      if (skipped.length) {
        lines.push(
          `⏭️ Skipped: ${skipped
            .map((s) => `@${s.jid.split("@")[0]} (${s.reason})`)
            .join(", ")}`
        );
      }
      if (failed.length) {
        lines.push(
          `❌ Failed: ${failed
            .map((f) => `@${f.jid.split("@")[0]} (${f.reason})`)
            .join(", ")}`
        );
      }

      const allMentions = [...kicked, ...skipped.map((s) => s.jid), ...failed.map((f) => f.jid)];

      return sendMessageWTyping(
        from,
        {
          text: lines.join("\n") || "Nothing happened.",
          mentions: allMentions,
        }
      );
    } catch (error) {
      console.error("Error in kick command:", error);
      return sendMessageWTyping(
        from,
        { text: "Failed to kick user(s)!" },
        { quoted: msg }
      );
    }
  },
});
