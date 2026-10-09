# Prototype validation

Validated 9 October 2026:

- TypeScript check passed.
- Four test groups passed: exact references, unsupported-question abstention, work/edition filters, citation tampering and voice gating.
- Web production export passed.
- Android JavaScript/Hermes export passed. This is not an installable APK or native-device test.
- Running API checks passed: exact lookup, request validation, unknown passage, gated voice, 18 planned Puranas, correction persistence.
- Chromium desktop (1440×1000) and mobile (390×844) checks passed: question → evidence → passage; bookmark survives reload; library includes all 18; unsupported identity question abstains. No browser runtime exceptions.

Screenshots: `study-desktop.png`, `study-mobile.png`.

Not completed: source licensing and human review, all-18 ingestion, semantic RAG, independent claim entailment model, production database/auth, signed APK/AAB, live voice, store release, 250-question benchmark, native-device testing.

Bottom navigation now uses react-native-safe-area-context for system insets and a compact 56-point bar with 44-point minimum tab targets. TypeScript and Android export passed after the change; native navigation-mode testing remains pending.
