export default () => ({
  cmd: ["cleartmp"],
  desc: "Clear temporary files. (Owner only)",
  usage: "cleartmp",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping, isOwner } = msgInfoObj;

    if (!msg.key.fromMe && !isOwner) {
      return sendMessageWTyping(from, {
        text: "❌ This command is only available for the owner!",
      }, { quoted: msg });
    }

    const fs = await import("fs");
    const path = await import("path");

    const tmpDir = path.join(process.cwd(), "tmp");
    const tempDir = path.join(process.cwd(), "temp");

    function clearDirectory(dirPath) {
      try {
        if (!fs.existsSync(dirPath)) {
          return { success: false, message: `Directory does not exist: ${dirPath}` };
        }
        const files = fs.readdirSync(dirPath);
        let deletedCount = 0;
        for (const file of files) {
          try {
            const filePath = path.join(dirPath, file);
            const stat = fs.lstatSync(filePath);
            if (stat.isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
            deletedCount++;
          } catch (err) {
            console.error(`Error deleting file ${file}:`, err);
          }
        }
        return { success: true, message: `Cleared ${deletedCount} files in ${path.basename(dirPath)}`, count: deletedCount };
      } catch (error) {
        return { success: false, message: `Failed to clear files in ${path.basename(dirPath)}`, error: error.message };
      }
    }

    const results = [clearDirectory(tmpDir), clearDirectory(tempDir)];
    const success = results.every((r) => r.success);
    const totalDeleted = results.reduce((sum, r) => sum + (r.count || 0), 0);
    const message = results.map((r) => r.message).join(" | ");

    if (success) {
      return sendMessageWTyping(from, { text: `✅ ${message}` }, { quoted: msg });
    } else {
      return sendMessageWTyping(from, { text: `❌ ${message}` }, { quoted: msg });
    }
  },
});
