# Knightbot-MD Command Conversion Plan

## Current State
- 108 root-level `commands/*.js` files restored from git history (commit `0a2b18c`)
- These are **CommonJS** (`require`/`module.exports`) and reference deleted `settings.js` and `lib/`
- `utils/commandLoader.js` only loads ESM commands from 4 subdirectories:
  - `commands/public/`, `commands/group/members/`, `commands/group/admins/`, `commands/owner/`
- Root commands are **NOT loaded** — they are orphaned duplicates
- Many root commands already have working ESM equivalents in subdirectories

## ESM Command Format Required
```js
export default () => ({
  cmd: ["commandname"],
  desc: "description",
  usage: ".commandname <args>",
  handler: async (sock, msg, from, args, msgInfoObj) => {
    // msgInfoObj.sendMessageWTyping(from, { text: "..." }, { quoted: msg })
  },
});
```

## Conversion Rules
1. `require('../settings.js')` → hardcode values or import from config (no settings.js exists)
2. `module.exports = async function(sock, chatId, message)` → ESM default export with handler
3. `sock.sendMessage(chatId, ...)` → `msgInfoObj.sendMessageWTyping(from, ...)`
4. Add `cmd`, `desc`, `usage` fields
5. Skip commands that already have an ESM equivalent in a subdirectory

## Command Categories → Destination Directory

**`commands/public/`** (general, fun, AI, downloader, textmaker, games):
ai, anime, attp, dare, eightball, emojimix, facebook, flirt, gif, github, goodnight,
hangman, igs, imagine, img-blur, instagram, insult, misc, pair, pies, ping, play,
rosetay, shayari, ship, simage, simp, sora, spotify, ss, staff, stupid, textmaker,
tictactoe, tiktok, topmembers, trivia, truth, url, video, viewonce, vv2, wasted, webgui

**`commands/group/admins/`** (group admin):
antibadword, antibot, anticall, antidelete, antitag, ban, clear, hidetag, kick,
mute, pmblocker, resetlink, tag, tagnotadmin, unban, unmute, warn

**`commands/group/members/`** (group member):
connected, character, compliment, groupinfo, groupmanage, groupstatus, mention

**`commands/owner/`** (bot owner):
clearsession, cleartmp, owner, savestatus, setpp, settings, update

**Skip (already have ESM equivalent in subdirectory):**
alive, chatbot, delete, demote, fact, help, joke, lyrics, meme, news, quote,
removebg, song, sticker, tagall, tts, translate, twitter, weather, welcome

## Backup
Full project backup at: `/tmp/knightbot-backup-$(date +%Y%m%d-%H%M%S)`

## Verification
- `node --check <file>` for syntax validation after each conversion
- No runtime testing possible until MongoDB connection is fixed on Render
