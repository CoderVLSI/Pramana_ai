# Pramana quality-of-life additions — implemented in 0.2.0

1. Subtle tab/bookmark haptics with a saved on/off setting.
2. Passage text size, line spacing and original/translation/both display controls. These do not create translations.
3. Light, dark and system themes with themed controls and readable text.
4. Latest 50 regular text turns saved locally, with evidence labels, question recall, individual deletion and clear-history confirmation. Live sessions and raw audio are not recorded.
5. Last opened passage per work, with resume links in Study and Library. Removed source packs can make a reading position unavailable; the UI explains this.
6. Work collection picker with search, edition and recorded translation-language filters, and local-only/web-only/local-then-web modes. Local filters do not restrict the public web or automatically translate queries. Live retains its own web switch and selected collection scope.
7. Bookmark folders and up to 2000 characters of personal notes per passage, kept separate from scripture. Saving a note also bookmarks the passage. Notes survive source-pack removal; Settings can clear study data.
8. Regular reply speed (0.75×–1.5×), replay/stop and visible listening/speaking/preparing states. Changes apply on next playback; Live streams retain their provider’s pace.
9. Source-pack download byte/progress display, checksum/review/install phases, actual storage size, per-pack removal with confirmation, release display and manual same-edition updates. Automatic publisher-update checks are not connected to a real release catalogue.
10. Opt-in local daily study reminders. Permission is requested on enable, not launch. Android may delay delivery under battery restrictions; exact-alarm permission is not requested.

## Fact checking and image review

Study opens a separate quote/screenshot checker. A selected JPEG/PNG under 4 MB stays local until the user taps Read screenshot. The app uses the selected provider’s available image-reading model to transcribe it; the user reviews and edits text and claimed reference before checking sources. Images and extracted text are not added to saved chat history. Image selection/transcription errors preserve manual input.

The shared `fact_check_claim` Live tool and manual checker return reviewed wording matches, related passages, or not verified. An exact wording match does not establish screenshot authenticity, correct attribution, translation equivalence, interpretation or context. Fixtures are excluded. If no exact local match exists, optional web fallback provides separately labelled unverified leads. No source corpus is invented to make this feature appear verified.

## Scratchpad and personal memory

Saved includes a private 6000-character scratchpad, up to 20 editable approved memories and up to 20 pending suggestions. Explicit “remember”, “I prefer”, “I study”, “call me” and similar statements produce local suggestions; the Remember command works without a provider request. Users can also scan recent local history for suggestions. This rule-based extraction does not infer preferences from arbitrary chats. Review/approve is required before sharing.

Memory sharing is off by default. Enabling it shares only approved items as bounded, untrusted JSON context for online explanations and new Live sessions, to adapt language/tone/study level. Private scratchpad, pending suggestions and full history are not included. Exact local scripture quotations and citation gates are unaffected. Common credential-shaped content is excluded from memory context and history recording. This is saved context, not model training, cross-device learning or automatic full-history summarization.

Users can edit/delete each memory or clear scratchpad, memories and suggestions together. Deletion disables future sharing but cannot recall data already sent to a provider. Scratchpad/memory controls are separate from history/notes/reading-position deletion.

## Accounts and release limits

The user chose to keep Google/email accounts pending and finish device features. Guest/device use remains available; no fake login is presented. Google sign-in (OpenID Connect) or email magic links will be useful for optional backup and cross-device sync after a real authentication service is configured. Email magic links are not OAuth. Authentication alone does not provide storage/sync. Never silently upload API keys, Ishta Devata preferences, notes or conversations.

The reviewed local scripture collection still contains zero actual passages in this release. Private OCR drafts and registered work names are not installed texts. Verified source packs and full-corpus storage remain pending.

Physical phone haptic feel, daily notification delivery, real provider image/OCR quality and Live voice/account access require device/account validation. This is a test-signed Android preview, not a Play Store production release.
