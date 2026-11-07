export default () => ({
  cmd: ["webgui"],
  desc: "Open the web admin dashboard.",
  usage: "webgui",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    return sendMessageWTyping(from, {
      text: "🌐 Web Admin Dashboard: Use the Render web interface at /admin\nLogin with your configured admin credentials.",
    }, { quoted: msg });
  },
});
