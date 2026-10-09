# Play Store listing and release readiness — draft

**Not submitted or published.** Prepared 9 October 2026 from the implemented development build. This copy is suitable for an honestly labelled limited test release once its backend is deployed and device checks pass; it does not imply production readiness.

## Draft listing text

App name: **Pramana: Scripture Study**

Short description: **Explore a scripture study preview, save passages, and report corrections.**

Full description:

> Pramana is an early scripture study preview with a text study screen, passage reader, bookmarks, and correction reports.
>
> The current test build includes five development Bhagavad Gita passages with Sanskrit text and development English renderings. These samples are not presented as an approved Gita Press edition. Source collections for Gita Press Mahapuranas, Valmiki Ramayana, Mahabharata, the Vedas and the Muktika list of 108 Upanishads are registered for preparation; their full texts are not currently available in the app.
>
> Search the available samples, open their passage details, and save passages on your device. When the selected collection has no verified evidence, Pramana displays that limitation rather than inventing a scriptural answer.
>
> An animated AI Rishi provides a visual preview. Settings support optional OpenAI and Gemini provider credentials and model-access checks through the configured backend. Live microphone conversation and synchronized voice playback are not available in this build.
>
> This is a limited development test, not a complete scripture library or an authoritative religious interpretation service. An internet connection and a working configured backend are required for study and settings requests.

The quoted text above is original draft marketing copy, not scripture quotation. Suggested category: **Books & Reference**, subject to account owner's choice. Content rating and target audience must be completed from the actual release; no age rating is invented here.

## Required public identity and assets

- Developer display/legal identity: **[REQUIRED — owner to provide]**.
- Support email and support website: **[REQUIRED — owner to provide]**.
- Public privacy-policy URL: **[REQUIRED — publish the completed policy on a stable public page]**.
- App icon exists, but final Play asset dimensions/exports and visual review remain required.
- Capture screenshots from the actual signed release on devices. Do not use mockups implying full collections or voice conversation work.
- Feature graphic and final localized listing assets remain to be prepared/verified.

## Concrete release gates

1. Deploy and verify a production HTTPS backend. The development localhost fallback is not a usable Play release service.
2. Create a signed Android App Bundle, confirm package/version/target SDK against current Play Console requirements, and retain signing credentials securely. A successful Expo Android JavaScript export alone is not a signed app.
3. Test installation and complete flows on real Android phones: system-bar insets, keyboard, bookmarks, backend errors, settings deletion and provider tests. Review the merged Android permissions and remove unnecessary permissions before release.
4. Complete privacy-policy identity/contact/retention details, publish its public URL, and reconcile the Data safety form with the final backend host, SDKs and provider behavior. The current app must not claim no data collection.
5. Keep corpus availability labels honest. All publisher-approved indexed sources currently remain zero; private OCR review indexes are not the app's public corpus. A full scripture/voice listing requires those features to be implemented and verified first.
6. Configure Play app access instructions, content rating, audience, declarations, reviewer access and applicable account verification. Optional provider settings must not leave core review flows inaccessible.
7. Use internal testing first, then the applicable closed-test/production-access process. No external submission has been made.

For personal developer accounts created **after 13 November 2023**, Google currently requires a closed test with **at least 12 testers continuously opted in for at least 14 days**, followed by an application for production access. Reaching the numbers is not automatic production approval; Google asks about test engagement, feedback and readiness. The user's account type and creation date are not yet known. Source checked 9 October 2026: [Google Play personal-account testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).

Privacy and Data safety declarations must reflect the final application, including third-party behavior: [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311). This document is a readiness draft, not a completed Play Console declaration.
