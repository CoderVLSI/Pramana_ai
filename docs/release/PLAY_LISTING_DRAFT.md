# Pramana: Play Store listing and privacy policy (DRAFT for owner review)

Not legal advice. Items marked VERIFY must be checked against the app before submission.

## Listing
- **Name:** Pramana
- **Short description (80):** Ask scripture questions by voice or text, with every verse traced to its source.
- **Full description:**
  Pramana is a study companion for the Bhagavad Gita and the principal Upanishads. Talk or type to Rishi, your study guide, and get answers that quote the verse and show where it comes from.
  - Voice and text chat, which keep working if you switch apps.
  - Verse cards with the printed source behind each text.
  - Honest labels: texts transcribed by AI from old printed editions say "AI-transcribed, not yet human-reviewed".
  - Past chats and saved verses on your phone.
  - Bring your own AI provider key; nothing is sold or shared.
  Pramana is a study aid, not religious authority. Check the sources.
- **Category:** Books & Reference. **Content rating:** answer the questionnaire (no violence, no user-generated public content).
- **Data safety form (draft answers, VERIFY each):**
  - Audio: sent to the AI provider the user selects, only while voice is on; not stored by us.
  - Text questions: sent to the user's selected AI provider and to our scripture search service to find verses (VERIFY exactly what the search request contains).
  - Chats, saved verses, preferences, API key: stored on the device only (key in secure storage).
  - No account, no ads, no analytics SDK (VERIFY none is bundled).

## Privacy policy (draft)
Pramana does not require an account and does not sell data.
1. **On your phone:** chat history, saved verses, settings and your AI provider key stay on the device. The key is kept in the phone's secure storage. Removing the app deletes them.
2. **Voice and text sent to an AI provider:** when you use voice or chat, your audio or text goes to the AI provider you chose (for example Google or OpenAI) using your own key. Their privacy terms apply to that data.
3. **Scripture search:** to find verses, the app sends your question to our scripture search service. (VERIFY what is logged server-side; state it here.)
4. **Microphone:** used only while voice is active; a notification shows while it runs in the background.
5. **Children:** not directed to children under 13.
6. **Contact:** (OWNER TO ADD an email address).

## Still needed from the owner
- Release signing key: the CI build uses Expo development signing; Play needs your own upload keystore (never commit it; add as a GitHub secret).
- Policy contact email and a public URL to host the policy.
- Screenshots (phone), 512×512 icon, 1024×500 feature graphic.
- Confirmation that "bring your own key" is acceptable for v1, or a decision to host AI access ourselves (costs and abuse limits).
