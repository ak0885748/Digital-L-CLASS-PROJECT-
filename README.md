# ElevenLabs AI Voice Studio 🎙️

A modern, responsive Text-to-Speech narration studio built using **HTML5**, **Vanilla CSS**, and **JavaScript** that integrates with the **ElevenLabs API**.

---

## ✨ Features

- 🧠 **AI Model Selector Dropdown**:
  - `Eleven Multilingual v2` (Highest quality & expressive natural speech)
  - `Eleven Turbo v2.5` (Ultra low latency)
  - `Eleven Flash v2.5` (Fastest generation speed)
  - `Eleven English v1` (Classic English narrator)
  - `Eleven Multilingual v1` (Standard multilingual)

- 🎙️ **Voice Persona Selector**:
  - Includes popular pre-configured ElevenLabs voices (*Rachel, Domi, Bella, Antoni, Josh, Arnold, Adam, Sam, Elli*).
  - **Live Sync**: Option to fetch all custom cloned and default voices directly from your ElevenLabs account.

- 🎛️ **Voice Fine-Tuning Drawer**:
  - Stability slider
  - Clarity & Similarity Boost slider
  - Style Exaggeration slider
  - Speaker Boost toggle

- 📝 **Interactive Script Workspace**:
  - Live character and word counters.
  - Quick-preset loader (*Story*, *Podcast*, *Meditation*, *Breaking News*).
  - Clear text button.
  - Shortcut: <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Enter</kbd> to generate speech immediately.

- 🎧 **Audio Player & Real-Time Visualizer**:
  - Live Web Audio API frequency waveform visualizer on HTML5 Canvas.
  - Custom timeline scrubber and time indicators.
  - Speed control presets (`0.75x`, `1.0x`, `1.25x`, `1.5x`).
  - Play, Pause, Replay, and Direct **Download MP3** button.

- 📜 **Generation History Playlist**:
  - Keeps track of previous narrations with voice tags, timestamps, instant replay, and download.

- 🔐 **API Key Manager & Demo Mode**:
  - Store your API key safely in `localStorage` without third-party exposure.
  - Built-in **Demo Mode fallback** with Web Speech synthesis so you can test the studio immediately even without an active API key.

---

## 🚀 Running the Project

### Option A: Interactive Web Studio (Browser UI)
Open [http://localhost:4321](http://localhost:4321) in your browser or run:
```bash
python3 -m http.server 4321
```

### Option B: Node.js SDK Runner
To run using the official `@elevenlabs/elevenlabs-js` SDK directly:

1. Install dependencies:
```bash
npm install
```
2. Set your environment variable:
```bash
export ELEVENLABS_API_KEY="your_api_key_here"
```
3. Run the script:
```bash
npm start
```

---

## 🔑 Adding your ElevenLabs API Key in the Web Studio

1. Click on the **Set API Key** button in the top-right corner.
2. Paste your API Key from [ElevenLabs Console](https://elevenlabs.io).
3. Click **Save API Key**.
4. Click **Sync Voices** to automatically load all your cloned and available account voices!
