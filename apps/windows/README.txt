PRAMANA WINDOWS PREVIEW

Windows 10/11, 64-bit. This is a portable browser-based app with an included local backend and Node.js runtime.

1. Extract the ZIP completely into a folder you can write to.
2. Double-click Start-Pramana.cmd.
3. Keep its console window open while using the app. It opens an Edge app window when available, or your default browser at http://localhost:8081.
4. Press Ctrl+C in the console to stop. Closing the browser alone does not stop the backend.

No Expo account or Node.js installation is required to run this preview.

Included: preferred-name setup, local study preferences, source library, bookmarks, API-key settings and animated Rishi preview. The five Bhagavad Gita development fixtures can be searched locally. Mahapuranas, epics, Vedas and Upanishads are source targets awaiting verified text; this package does not contain their full scripture corpora. Voice mode supports tap-to-talk, editable transcripts, spoken greetings/source-status replies and reviewed audio-enabled passages. Enable Voice mode, tap Speak your question, then press Ask aloud. Provider failures fall back to device speech with a visible explanation. Live conversation additionally streams browser microphone audio and AI replies, shows tool calls and separate source references, and supports interruption. Enable Live conversation and tap Start live voice. Web search tools are enabled by default and can be switched off before connecting. Live speech is AI-generated; citations are checked separately.

Reading preferences use the browser's local storage. API credentials and feedback use the local backend; provider keys are encrypted on disk under %LOCALAPPDATA%\Pramana\data. Keep this directory private. Provider connection checks require internet access. Backend and web server bind to the computer's loopback interface only, on ports 3001 and 8081. If another program uses these ports, close that program or stop another Pramana instance first.

This preview is a ZIP package with a command launcher, rather than a Windows installer. Its checksum is recorded in the source repository's Windows build document.

Bundled server and UI were tested together in Linux/Chromium. The Windows executable/launcher has not been tested on a physical Windows computer.
