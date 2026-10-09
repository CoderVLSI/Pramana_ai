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

Provider-settings update:

- Eleven test groups pass, including encrypted credential isolation/persistence/removal, temporary-failure fallback, authentication-error stops, cross-provider opt-in, retired-model filtering, spoken-script matching, and provider connection mocks.
- Running settings API checks pass: bearer session isolation, no echoed keys, fallback validation, deletion, and fixture voice denial before provider calls.
- Mobile browser settings flow passes: masked key entry, save/reload, provider switching, fallback controls, mocked connection check, key removal, and session deletion.
- Web and Android exports pass with the new Settings screen and SecureStore dependency.
- No real provider keys were used. Provider audio access, native SecureStore behavior, microphone capture, and playback still require account/device testing.

Gita Press collection update:

- Publisher target locked to Gita Press, Gorakhpur for the 18-work collection; precise print editions remain unselected.
- Official catalog metadata inspected; abridged/digest candidate labels retained. No current Brahmanda candidate identified. No conclusion about publisher availability or full-edition completeness is inferred.
- Seventeen tests pass, including intake rights/coverage checks, section-aware passage identities, independently licensed translations, and no reassignment of Gita fixtures to Gita Press.
- TypeScript and web/Android exports pass.
- No Purana text is supplied or indexed. User-held books/PDFs have unclear usage permission. Production lexical/vector RAG integration remains pending input and rights/editorial approval.

All-18 collection browser and API checks pass: 18 selected work IDs are accepted, unindexed sources abstain, and Gita fixtures remain separately selectable.
