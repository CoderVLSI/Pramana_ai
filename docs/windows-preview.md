# Windows portable preview

Download package: Pramana-Windows-preview.zip. Extract completely and open Start-Pramana.cmd. Supports Windows 10/11 x64 and includes an official checksum-verified Node.js v22.23.3 runtime, static Expo web export, and a compiled local Fastify backend. Edge app mode is used when Edge is found; default browser fallback otherwise. Keep the console open and press Ctrl+C to stop.

Servers bind only to loopback. The backend now supports HOST and PRAMANA_DATA_DIR overrides; defaults for existing development remain unchanged. The Windows launcher stores backend settings and feedback under LOCALAPPDATA/Pramana/data. No credentials or private scripture OCR are included in the ZIP.

The five Gita development fixtures support local test searches. All other collections remain pending source review. Live voice remains unconnected. This is a portable browser-based preview, not a native Windows installer.

Validation: TypeScript and all 18 test groups pass. Packaged UI and packaged backend passed Chromium checks for profile creation/persistence, fixture search, and Rishi animation, with no browser errors. API register reports132targets; unsupported-source query abstains. Windows Node binary checksum matched official Node distribution metadata. The Windows launcher itself has not been exercised on a Windows machine.

ZIP SHA-256: 1965c8ff361ed4f2d9ab9122933983f35e775f9e7e2cbad7e0740f139408e887
