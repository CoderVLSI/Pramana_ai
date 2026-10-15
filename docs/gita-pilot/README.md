# Bhagavad Gita pilot (open sources)

`gita-open-1` contains 700 Sanskrit verses transcribed from the 1909 Anandashram scan. It was published to LIVE on 2026-10-15 after isolated local TEST verification. The owner accepted the rights basis and approved release **without human verse-by-verse review**. AI transcription errors may remain.

See the [publication report](release-report-2026-10-15.md) and [machine verification results](release-verification-2026-10-15.json) for commands, migration changes, recovered failures and TEST/LIVE outputs.

Committed release artifacts are `services/ingest/releases/gita-open-1.bundle.json` and `services/ingest/releases/gita-open-1.provenance.json`. The source XML hash matches the owner's supplied hash. Scan locators are recorded for all verses; printed pages are not mapped. No modern translation or Gita Press text is included.

The open-source migration is applied to LIVE. The app backend flag remains OFF until the owner approves enabling it after retrieval-code review. No APK was built for this publication task.

Future releases should record source rights, hashes, edition coverage and truthful review attestations using `provenance.template.json`, validate with the bundle builder and publisher, then test before LIVE publication. The owner exception to human review applies to this release only.
