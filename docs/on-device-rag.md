# On-device scripture retrieval

Android now has an actual local retrieval path instead of a hard-coded empty
answer. It still ships with **zero reviewed scripture passages**. The private
scan indexes are preparation material and are not included in the APK.

Settings → Scripture on this phone installs a reviewed Gita Press JSON bundle
using its HTTPS URL and independently supplied SHA-256 checksum. The JSON format
is the existing `GitaPressBundle` schema. It requires edition and release identity,
volume and print/PDF locators, exact chapter/verse hierarchy, coverage declaration,
review records and usage metadata. Original and translated text have separate
quotation and audio permissions. A checksum checks integrity; the user must still
trust the publisher's editorial records. Metadata assertions are not a digital
signature or independent scholarly verification.

Pack bodies are stored in private app files, with only a small inventory in
AsyncStorage. They are checksum-checked and revalidated when the app reconstructs
its index. Corrupt files are excluded and shown in Settings. Installs are serialized
and validated before the inventory is committed. The API key stays in SecureStore.

Study and Live search installed, selected sources first. Local hits return exact
quotations and immutable source IDs without a provider or backend request. A miss
can use the configured provider's web search; those results remain external and
unverified. Explicit Live web searches still search the web, even when local
passages exist. Library counts refresh after returning from Settings, and the
reader shows edition, review state and scan/print locations.

This is lexical BM25 retrieval with Hindi/Sanskrit combining characters preserved,
plus hierarchical verse-reference lookup. It is not semantic English-to-Sanskrit
search or an AI-generated doctrinal conclusion. The current pilot limits each pack
to 5 MB, inventory to 30 packs and index to 25,000 passages. A SQLite-backed index,
incremental downloads, cross-language retrieval and measured phone latency are
needed before distributing the full Puranas, epics and other collections.

Remaining source work: complete OCR repairs, identify exact editions and missing
volumes, verify text against scans, map chapters/verses and printed pages, and
establish the relevant usage record. Do not label abridged Skanda or partial
Brahmanda sources as complete works. No real publisher bundle has been released
through this installer yet; automated retrieval tests use artificial test-only
records, which are not distributed in the app.

Validation: all 57 automated tests passed, including five synthetic local-retrieval tests. TypeScript checks, web and Android exports, and arm64/x86 Android builds passed. The final x86 APK reached onboarding after a fresh Android 15 emulator install and remained alive. The standalone API container health check also passed. Real publisher-pack installation, Nord 4 launch, live provider audio, and full-corpus phone performance remain unverified.
