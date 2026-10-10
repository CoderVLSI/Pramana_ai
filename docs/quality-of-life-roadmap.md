# Pramana quality-of-life additions

1. Haptic feedback for tab selection and bookmarks, with a persisted Settings switch. Implemented in source; a rebuilt native APK and physical-device validation are still needed.
2. Readable text controls: font size, line spacing and Sanskrit/Hindi display options.
3. Light/dark/system theme with sufficient contrast.
4. On-device conversation history with delete and clear controls.
5. Resume the last reading position for each installed work.
6. Search filters for work, language, edition and reviewed/local versus web evidence.
7. Bookmark folders and personal notes stored locally.
8. Voice controls for playback speed, stop/replay and visible listening/speaking state.
9. Source-pack management with size, download progress, storage use and update status.
10. Optional study reminders with permission requested only when enabled.

Items 2–10 are proposals, not implemented features. Verified source packs and robust full-corpus storage remain higher priorities than additional collections.

Keep guest use available. Google sign-in (OpenID Connect) or email magic-link authentication becomes useful for optional encrypted backup and cross-device sync. Email magic links are not OAuth. Neither requires users to hand over their AI-provider key to Pramana. Authentication alone does not provide storage/sync: those need a managed service or backend, privacy disclosures and account/data deletion. Never silently upload API keys, Ishta Devata preferences, notes or conversations. Device-only usage requires no Pramana backend.
