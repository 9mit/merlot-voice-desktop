# Merlot Voice �

A **Wispr-like** desktop voice-to-text application that works **system-wide**. Hold a hotkey anywhere, speak, and the transcribed text automatically appears in whatever app you're using.

![Merlot Voice](https://img.shields.io/badge/Status-Working-green)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Tech](https://img.shields.io/badge/Built%20with-Tauri%20%2B%20React-orange)

## ✨ Features

- **System-Wide Push-to-Talk** — Hold `Alt+G` anywhere to speak, release to inject text
- **Real-Time Transcription** — Powered by Deepgram Nova-2 with low latency
- **Works Across Any App** — Notepad, Chrome, Slack, VS Code, Word, etc.
- **Beautiful UI** — Premium dark glassmorphism design
- **Cross-Platform** — Windows, macOS, and Linux support

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) (latest stable)
- [Deepgram API Key](https://deepgram.com/) (free tier available)

### Installation

```bash
# Clone the repository
git clone https://github.com/9mit/merlot-voice-desktop.git
cd merlot-voice-desktop/merlot-voice

# Install dependencies
npm install

# Create .env file with your Deepgram API key
echo "VITE_DEEPGRAM_API_KEY=your_api_key_here" > .env

# Run the app
npm run tauri dev
```

## 🎙️ How to Use

### Method 1: Push-to-Talk (Recommended)

1. Launch the app and **minimize** it
2. Focus on any text input (Notepad, browser, etc.)
3. **Hold `Alt+G`** and speak
4. **Release `Alt+G`** — text appears instantly!

### Method 2: In-App Recording

1. Click the 🎙️ **microphone button** to start recording
2. Speak your message
3. Click ⏹️ to stop
4. Click 📤 **Send** to paste into the focused app

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | [Tauri 2.x](https://tauri.app/) |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| Transcription | [Deepgram](https://deepgram.com/) Nova-2 |
| Global Hotkey | `tauri-plugin-global-shortcut` |
| Text Injection | `enigo` (keyboard simulation) |

## 📁 Project Structure

```
merlot-voice/
├── src/                    # React frontend
│   ├── App.tsx            # Main UI component
│   ├── hooks/             # Custom React hooks
│   │   └── useTranscription.ts
│   └── services/          # Backend services
│       ├── audioService.ts
│       ├── deepgramService.ts
│       └── pushToTalkService.ts
├── src-tauri/             # Rust/Tauri backend
│   ├── src/
│   │   ├── lib.rs         # Plugin initialization & commands
│   │   └── main.rs        # Entry point
│   ├── Cargo.toml         # Rust dependencies
│   └── capabilities/      # Tauri permissions
└── package.json
```

## ⚙️ Configuration

| Setting | Default | Location |
|---------|---------|----------|
| Hotkey | `Alt+G` | `src-tauri/src/lib.rs` |
| Deepgram Model | `nova-2` | `src/services/deepgramService.ts` |
| Language | `en-US` | `src/services/deepgramService.ts` |

## 🔧 Building for Production

```bash
npm run tauri build
```

Output will be in `src-tauri/target/release/`.

## � License

MIT License - feel free to use and modify!


