# Discord Music Bot — Setup Guide

## Prerequisites

### 1. Install Node.js
Download and install from https://nodejs.org (LTS version v20+)

After installing, restart your terminal and verify:
```
node --version
npm --version
```

### 2. Install yt-dlp
yt-dlp is required for audio streaming.

Download from: https://github.com/yt-dlp/yt-dlp/releases/latest
- Download `yt-dlp.exe`
- Place it somewhere in your system PATH (e.g. `C:\Windows\System32\`)
  OR put it in the project folder

### 3. Install FFmpeg
FFmpeg is required for audio processing.

Download from: https://www.gyan.dev/ffmpeg/builds/
- Download the "essentials" build
- Extract and add the `bin/` folder to your system PATH
  (Search "Environment Variables" in Windows → Edit PATH → Add the bin folder)

---

## Bot Configuration

### Step 1: Create a Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application" → give it a name
3. Go to **Bot** tab → click "Add Bot"
4. Copy the **Token** (you'll need this)
5. Copy the **Application ID** from the General Information tab (this is your CLIENT_ID)

Enable these **Privileged Gateway Intents**:
- Message Content Intent
- Server Members Intent

### Step 2: Configure Environment
```
cp .env.example .env
```
Edit `.env` and fill in:
- `DISCORD_TOKEN` — your bot token
- `CLIENT_ID` — your application ID

### Step 3 (Optional): Spotify Support
1. Go to https://developer.spotify.com/dashboard
2. Create an app → get Client ID and Client Secret
3. Add them to `.env`

### Step 4 (Optional): Lyrics Support
1. Go to https://genius.com/api-clients
2. Create an account → New API Client → copy Access Token
3. Add it to `.env` as `GENIUS_TOKEN`

### Step 5: Invite the Bot to Your Server
Replace `CLIENT_ID` with your actual ID:
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

---

## Running the Bot

### Install dependencies
```
npm install
```

### Start the bot
```
npm start
```

### Development mode (auto-restarts on changes)
```
npm run dev
```

---

## Commands

| Command | Description |
|---------|-------------|
| `/play <query>` | Play a song or playlist from YouTube, Spotify, SoundCloud, or any URL |
| `/pause` | Pause or resume the current song |
| `/skip [amount]` | Skip 1 or more songs |
| `/stop` | Stop music and clear the queue |
| `/queue [page]` | View the song queue |
| `/nowplaying` | Show current song with progress bar |
| `/volume [level]` | Get or set volume (1–150%) |
| `/loop <mode>` | Set loop mode: off / song / queue |
| `/shuffle` | Shuffle the queue |
| `/seek <time>` | Seek to a position (e.g. `1:30`) |
| `/remove <position>` | Remove a song from the queue |
| `/lyrics [song]` | Get lyrics for current or specified song |
| `/autoplay` | Toggle autoplay when queue ends |
| `/disconnect` | Disconnect from voice channel |
