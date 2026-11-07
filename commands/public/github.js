export default () => ({
  cmd: ["github", "git", "sc", "script", "repo"],
  desc: "Show bot GitHub repository info.",
  usage: "github",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    try {
      const res = await fetch("https://api.github.com/repos/Nicetv1165/Topai-md");
      if (!res.ok) throw new Error("Error fetching repository data");
      const json = await res.json();

      const updated = new Date(json.updated_at).toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      let txt = `*乂  Topai Bot MD  乂*\n\n`;
      txt += `✩  *Name* : ${json.name}\n`;
      txt += `✩  *Watchers* : ${json.watchers_count}\n`;
      txt += `✩  *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
      txt += `✩  *Last Updated* : ${updated}\n`;
      txt += `✩  *URL* : ${json.html_url}\n`;
      txt += `✩  *Forks* : ${json.forks_count}\n`;
      txt += `✩  *Stars* : ${json.stargazers_count}\n\n`;
      txt += `💥 *Topai MD*`;

      return sendMessageWTyping(from, { text: txt }, { quoted: msg });
    } catch (error) {
      console.error("Error fetching GitHub info:", error);
      return sendMessageWTyping(from, { text: "❌ Error fetching repository information." }, { quoted: msg });
    }
  },
});
