---
title: Topai WhatsApp Bot
emoji: 🤖
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
license: mit
---

# 🤖 Topai WhatsApp Bot — Multi-User Edition

A powerful, multi-user WhatsApp MD bot running on HuggingFace Spaces with a clean web interface for connecting any phone number via **pair code** or **QR code**.

## ✨ Features

- **Multi-User** — Connect as many WhatsApp numbers as you want simultaneously
- **Web UI** — Clean dashboard to connect/disconnect sessions
- **Pair Code** — Connect without scanning QR (just enter your phone number)
- **QR Code** — Traditional QR code connection
- **Session Persistence** — Sessions survive server restarts
- **YouTube** — Download audio (`.song`) and video (`.video`)
- **TikTok** — Download videos without watermark (`.tiktok`)
- **Instagram** — Download posts and reels (`.ig`)
- **AI Chat** — Built-in AI responses (`.ai`)
- **Sticker Maker** — Convert images to stickers (`.sticker`)
- **QR Generator** — Generate QR from any text (`.qr`)
- **Translation** — 50+ languages (`.tr`)
- **Weather** — Real-time weather, no API key (`.weather`)
- **Group Management** — Full admin tools
- **Fun Commands** — Trivia, quotes, dice, coin flip, and more

## 🚀 Quick Start

### Connect via Web UI

1. Open the Spaces URL (e.g. `https://your-space.hf.space`)
2. Enter your phone number with country code (e.g. `2347026096039`)
3. Choose **Pair Code** or **QR Code**
4. Follow the on-screen instructions to link in WhatsApp

### Using Pair Code (Recommended)

1. Open WhatsApp → **Linked Devices** → **Link a Device**
2. Tap **Link with phone number instead**
3. Enter your phone number
4. Type the 8-digit code shown on the web UI

## 📦 Commands

### 🎵 Media
| Command | Description |
|---------|-------------|
| `.song <name/URL>` | Download YouTube audio |
| `.video <name/URL>` | Download YouTube video |
| `.tiktok <URL>` | Download TikTok video (no watermark) |
| `.ig <URL>` | Download Instagram post/reel |
| `.lyrics <song>` | Find song lyrics |

### 🛠️ Utility
| Command | Description |
|---------|-------------|
| `.sticker` | Convert image to sticker (reply to image) |
| `.qr <text>` | Generate QR code |
| `.tr <lang> <text>` | Translate text |
| `.weather <city>` | Get weather info |
| `.shorten <URL>` | Shorten a URL |
| `.calc <expression>` | Calculator |
| `.ping` | Check bot response time |
| `.info` | Bot info & system stats |

### 🎮 Fun
| Command | Description |
|---------|-------------|
| `.trivia` | Random trivia question |
| `.quote` | Motivational quote |
| `.coinflip` | Flip a coin |
| `.dice [sides]` | Roll a dice |
| `.joke` | Random joke |
| `.dare` / `.truth` | Truth or dare |

### 🤖 AI
| Command | Description |
|---------|-------------|
| `.ai <question>` | Chat with AI |
| `.gptimage <prompt>` | AI image editing |

### 👑 Group Admin
| Command | Description |
|---------|-------------|
| `.kick @user` | Remove member |
| `.promote @user` | Make admin |
| `.demote @user` | Remove admin |
| `.mute` / `.unmute` | Mute/unmute group |
| `.tagall` | Tag all members |
| `.welcome on/off` | Welcome messages |
| `.antilink on/off` | Anti-link protection |

## ⚙️ Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 7860 for HF Spaces) |
| `SESSION_ID` | Pre-loaded session string (optional) |

## 🐳 HuggingFace Spaces Deployment

This bot is pre-configured for HuggingFace Spaces Docker:
- Port: **7860** (Spaces default)
- Persistent sessions stored in `/app/sessions/`
- No API keys required for core features

## ⚠️ Disclaimer

This bot is for educational purposes. Using third-party WhatsApp clients may violate WhatsApp's Terms of Service.
